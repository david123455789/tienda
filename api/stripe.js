const crypto = require('crypto');
const { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { validarProductos } = require('./_catalogo');
const { crearPedidoEnSheets } = require('./_sheetsPedidos');

/*
 * Pagos con tarjeta con Stripe, todo en un solo archivo (Vercel Hobby limita las funciones):
 *
 *   POST { accion: 'crear' }      -> crea el cobro (PaymentIntent) con el total calculado aquí en el
 *                                    servidor y devuelve lo necesario para mostrar el formulario de tarjeta.
 *   POST { accion: 'confirmar' }  -> el navegador avisa que pagó; aquí se le pregunta a Stripe si es cierto
 *                                    antes de crear el pedido en el Sheet.
 *   POST con firma de Stripe      -> aviso (webhook) de Stripe, por si el cliente cierra la pestaña.
 *
 * El número de la tarjeta nunca pasa por este servidor: lo recibe Stripe directo desde el navegador.
 * Variables en Vercel: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET.
 */

const ORIGENES_PERMITIDOS = [
  'https://david123455789.github.io',
  'https://tienda-alpha-red.vercel.app',
  'https://inequestrian.com.mx',
  'https://www.inequestrian.com.mx',
  'http://localhost:3000'
];

function aplicarCors(req, res) {
  const origen = req.headers.origin;

  if (origen && ORIGENES_PERMITIDOS.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Se lee el cuerpo "crudo" porque la firma del webhook se calcula sobre el texto exacto que manda Stripe.
function leerCuerpoCrudo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', (parte) => partes.push(parte));
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}

async function llamarStripe(ruta, parametros) {
  const clave = process.env.STRIPE_SECRET_KEY;

  if (!clave) {
    throw new Error('Falta STRIPE_SECRET_KEY en Vercel.');
  }

  const opciones = {
    method: parametros ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${clave}` }
  };

  if (parametros) {
    opciones.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opciones.body = new URLSearchParams(parametros).toString();
  }

  const respuesta = await fetch(`https://api.stripe.com/v1${ruta}`, opciones);
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error((datos.error && datos.error.message) || 'Stripe rechazó la operación.');
  }

  return datos;
}

async function reclamarDedup(db, clave) {
  try {
    await db.collection('pedidos_creados').doc(clave).create({ creado: Date.now() });
    return true;
  } catch (error) {
    return false;
  }
}

async function liberarDedup(db, clave) {
  try {
    await db.collection('pedidos_creados').doc(clave).delete();
  } catch (error) {
    // nada más que hacer
  }
}

// Crea el pedido en el Sheet una sola vez por cobro (el navegador y el webhook pueden llegar los dos).
async function procesarPagoStripe(db, paymentIntentId) {
  const intento = await llamarStripe(`/payment_intents/${encodeURIComponent(paymentIntentId)}`);

  if (intento.status !== 'succeeded') {
    return { ok: false, mensaje: 'El pago todavía no está aprobado.' };
  }

  const pendienteRef = db.collection('pedidos_pendientes_stripe').doc(paymentIntentId);
  const pendienteSnap = await pendienteRef.get();

  if (!pendienteSnap.exists) {
    // Ya se procesó antes (se borra al terminar) o nunca fue de esta tienda.
    return { ok: true, repetido: true };
  }

  const datos = pendienteSnap.data();

  // El monto cobrado debe coincidir con el calculado por el servidor al crear el cobro.
  if (Number(intento.amount_received) !== Number(datos.centavos)) {
    throw new Error('El monto cobrado no coincide con el pedido.');
  }

  const claveDedup = `st_${paymentIntentId}`;

  if (!(await reclamarDedup(db, claveDedup))) {
    return { ok: true, repetido: true };
  }

  try {
    const idEnvio = await crearPedidoEnSheets({
      nombre: datos.nombre_cuenta || (datos.direccion ? datos.direccion.nombre : '') || '',
      correo: datos.correo_cuenta || '',
      telefono: datos.direccion ? datos.direccion.telefono : '',
      direccion: datos.direccion || {},
      tipo: datos.tipo || 'envio',
      productos: datos.productos || []
    });

    await pendienteRef.delete();
    return { ok: true, idEnvio };
  } catch (error) {
    await liberarDedup(db, claveDedup);
    throw error;
  }
}

function firmaValida(cuerpoCrudo, encabezado) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secreto || !encabezado) return false;

  const partes = {};
  String(encabezado).split(',').forEach((par) => {
    const [clave, valor] = par.split('=');
    if (clave === 'v1') {
      partes.v1 = (partes.v1 || []).concat(valor);
    } else {
      partes[clave] = valor;
    }
  });

  if (!partes.t || !partes.v1) return false;

  // Se rechazan avisos de hace más de 5 minutos (evita reenvíos copiados).
  if (Math.abs(Date.now() / 1000 - Number(partes.t)) > 300) return false;

  const esperada = crypto
    .createHmac('sha256', secreto)
    .update(`${partes.t}.${cuerpoCrudo.toString('utf8')}`)
    .digest('hex');

  return partes.v1.some((firma) => {
    const a = Buffer.from(firma, 'hex');
    const b = Buffer.from(esperada, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

async function crearCobro(req, res, cuerpo) {
  const { productos, direccion, tipoEntrega } = cuerpo;

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Carrito vacio' });
  }

  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    throw new Error('Falta STRIPE_PUBLISHABLE_KEY en Vercel.');
  }

  let usuario = null;
  try {
    usuario = await obtenerUsuarioDesdeToken(req);
  } catch (error) {
    usuario = null;
  }

  if (!usuario) {
    return res.status(401).json({ error: 'Inicia sesión para pagar.' });
  }

  // Los precios y el total salen de tu catálogo, nunca del navegador.
  const verificado = await validarProductos(productos, tipoEntrega);
  const total = Number(verificado.total);
  const centavos = Math.round(total * 100);

  if (!(centavos >= 1000)) {
    return res.status(400).json({ error: 'El total debe ser de al menos $10.00 MXN.' });
  }

  const intento = await llamarStripe('/payment_intents', {
    amount: String(centavos),
    currency: 'mxn',
    'payment_method_types[]': 'card',
    description: 'Pedido In Equestrian Shop',
    'metadata[uid]': usuario.uid || ''
  });

  const db = obtenerFirestoreAdmin();
  await db.collection('pedidos_pendientes_stripe').doc(intento.id).set({
    uid: usuario.uid || '',
    nombre_cuenta: usuario.nombre || '',
    correo_cuenta: usuario.email || '',
    productos: verificado.productos,
    direccion: direccion || {},
    tipo: verificado.tipo,
    centavos,
    creado: Date.now()
  });

  return res.status(200).json({
    ok: true,
    clientSecret: intento.client_secret,
    paymentIntentId: intento.id,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    total
  });
}

module.exports = async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const cuerpoCrudo = await leerCuerpoCrudo(req);

    // Aviso (webhook) de Stripe: trae firma.
    if (req.headers['stripe-signature']) {
      if (!firmaValida(cuerpoCrudo, req.headers['stripe-signature'])) {
        return res.status(400).json({ error: 'Firma inválida.' });
      }

      const evento = JSON.parse(cuerpoCrudo.toString('utf8'));

      if (evento.type === 'payment_intent.succeeded' && evento.data && evento.data.object) {
        const resultado = await procesarPagoStripe(obtenerFirestoreAdmin(), evento.data.object.id);
        return res.status(200).json(resultado);
      }

      return res.status(200).json({ ignorado: true });
    }

    let cuerpo = {};
    try {
      cuerpo = JSON.parse(cuerpoCrudo.toString('utf8') || '{}');
    } catch (error) {
      return res.status(400).json({ error: 'Datos inválidos.' });
    }

    if (cuerpo.accion === 'crear') {
      return await crearCobro(req, res, cuerpo);
    }

    if (cuerpo.accion === 'confirmar' && cuerpo.paymentIntentId) {
      const resultado = await procesarPagoStripe(
        obtenerFirestoreAdmin(),
        String(cuerpo.paymentIntentId)
      );
      return res.status(200).json(resultado);
    }

    return res.status(400).json({ error: 'Faltan datos.' });
  } catch (error) {
    console.error('Error en /api/stripe:', error);

    if (error.paraCliente) {
      return res.status(error.status || 400).json({ error: error.message, message: error.message });
    }

    return res.status(500).json({ error: 'No se pudo procesar el pago con tarjeta.', message: error.message });
  }
};

// Necesario para poder verificar la firma de Stripe.
module.exports.config = { api: { bodyParser: false } };