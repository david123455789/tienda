const crypto = require('crypto');
const { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { validarProductos } = require('./_catalogo');
const { crearPedidoEnSheets } = require('./_sheetsPedidos');

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
  }
}

async function procesarPagoStripe(db, paymentIntentId) {
  const intento = await llamarStripe(`/payment_intents/${encodeURIComponent(paymentIntentId)}`);

  if (intento.status !== 'succeeded') {
    return { ok: false, mensaje: 'El pago todavía no está aprobado.' };
  }

  const pendienteRef = db.collection('pedidos_pendientes_stripe').doc(paymentIntentId);
  const pendienteSnap = await pendienteRef.get();

  if (!pendienteSnap.exists) {
    return { ok: true, repetido: true };
  }

  const datos = pendienteSnap.data();

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
      codigo: datos.codigo || '',
      descuento: datos.descuento || 0,
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
  const { productos, direccion, tipoEntrega, codigo } = cuerpo;

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Carrito vacio' });
  }

  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    throw new Error('Falta STRIPE_PUBLISHABLE_KEY en Vercel.');
  }

  const pkReal = String(process.env.STRIPE_PUBLISHABLE_KEY).startsWith('pk_live');
  const skReal = /^(sk|rk)_live/.test(String(process.env.STRIPE_SECRET_KEY || ''));

  if (pkReal !== skReal) {
    throw new Error('Las llaves de Stripe en Vercel no coinciden: una es de prueba y la otra es real.');
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

  const verificado = await validarProductos(productos, tipoEntrega, codigo);
  const total = Number(verificado.total);
  const centavos = Math.round(total * 100);

  if (!(centavos >= 1000)) {
    return res.status(400).json({ error: 'El total debe ser de al menos $10.00 MXN.' });
  }

  const intento = await llamarStripe('/payment_intents', {
    amount: String(centavos),
    currency: 'mxn',
    'automatic_payment_methods[enabled]': 'true',
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
    codigo: verificado.codigo || '',
    descuento: verificado.descuento || 0,
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

module.exports.config = { api: { bodyParser: false } };