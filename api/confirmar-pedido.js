const { obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { crearPedidoEnSheets } = require('./_sheetsPedidos');

/*
 * El cliente llega aquí cuando Mercado Pago o PayPal lo regresan a la tienda
 * después de pagar. Este archivo NUNCA confía en lo que diga el navegador:
 * vuelve a preguntarle directamente a Mercado Pago / PayPal si ese pago
 * de verdad se completó antes de crear el pedido en el Sheet. Así nadie
 * puede "inventarse" un pedido solo entrando a la URL de éxito.
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

async function reclamarDedup(db, clave) {
  try {
    await db.collection('pedidos_creados').doc(clave).create({ creado: Date.now() });
    return true;
  } catch (error) {
    // Ya existe: este pago ya generó su pedido antes (por ejemplo, si el
    // cliente recargó la página de "pago aprobado").
    return false;
  }
}

async function liberarDedup(db, clave) {
  try {
    await db.collection('pedidos_creados').doc(clave).delete();
  } catch (error) {
    // si no se pudo liberar, no hay nada más que hacer
  }
}

async function confirmarMercadoPago(paymentId) {
  const respuesta = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
  });

  const pago = await respuesta.json();

  if (!respuesta.ok || pago.status !== 'approved') {
    return null;
  }

  const metadata = pago.metadata || {};

  let productos = [];
  let direccion = {};

  try {
    productos = JSON.parse(metadata.productos_json || '[]');
  } catch (error) {
    productos = [];
  }

  try {
    direccion = JSON.parse(metadata.direccion_json || '{}');
  } catch (error) {
    direccion = {};
  }

  return {
    nombre: metadata.nombre_cuenta || direccion.nombre || '',
    correo: metadata.correo_cuenta || '',
    telefono: direccion.telefono || '',
    direccion,
    productos
  };
}

async function obtenerTokenPaypal() {
  const credenciales = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const respuesta = await fetch(
    `${process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com'}/v1/oauth2/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credenciales}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    }
  );

  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error('No se pudo autenticar con PayPal.');
  return datos.access_token;
}

async function confirmarPaypal(orderId, db) {
  const base = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';
  const token = await obtenerTokenPaypal();

  const respuestaOrden = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const orden = await respuestaOrden.json();

  if (!respuestaOrden.ok) return null;

  let estatusFinal = orden.status;

  if (orden.status === 'APPROVED') {
    const respuestaCaptura = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const captura = await respuestaCaptura.json();

    if (!respuestaCaptura.ok) return null;
    estatusFinal = captura.status;
  }

  if (estatusFinal !== 'COMPLETED') return null;

  const pendienteSnap = await db.collection('pedidos_pendientes_paypal').doc(orderId).get();

  if (!pendienteSnap.exists) return null;

  const datos = pendienteSnap.data();

  return {
    nombre: datos.nombre_cuenta || (datos.direccion ? datos.direccion.nombre : '') || '',
    correo: datos.correo_cuenta || '',
    telefono: datos.direccion ? datos.direccion.telefono : '',
    direccion: datos.direccion || {},
    productos: datos.productos || []
  };
}

async function procesarPagoMercadoPago(paymentId, db) {
  const claveDedup = `mp_${paymentId}`;
  const datosPedido = await confirmarMercadoPago(paymentId);

  if (!datosPedido) {
    return { ok: false, mensaje: 'El pago todavía no está aprobado.' };
  }

  const esNuevo = await reclamarDedup(db, claveDedup);

  if (!esNuevo) {
    return { ok: true, repetido: true };
  }

  try {
    const idEnvio = await crearPedidoEnSheets(datosPedido);
    return { ok: true, idEnvio };
  } catch (errorSheets) {
    await liberarDedup(db, claveDedup);
    throw errorSheets;
  }
}

async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const { proveedor, paymentId, orderId } = req.body || {};
    const db = obtenerFirestoreAdmin();

    let claveDedup;
    let datosPedido;

    if (proveedor === 'mercadopago' && paymentId) {
      claveDedup = `mp_${paymentId}`;
      datosPedido = await confirmarMercadoPago(paymentId);
    } else if (proveedor === 'paypal' && orderId) {
      claveDedup = `pp_${orderId}`;
      datosPedido = await confirmarPaypal(orderId, db);
    } else {
      return res.status(400).json({ error: 'Faltan datos para confirmar el pago.' });
    }

    if (!datosPedido) {
      return res.status(200).json({ ok: false, mensaje: 'El pago todavía no está aprobado.' });
    }

    const esNuevo = await reclamarDedup(db, claveDedup);

    if (!esNuevo) {
      return res.status(200).json({ ok: true, repetido: true });
    }

    let idEnvio;

    try {
      idEnvio = await crearPedidoEnSheets(datosPedido);
    } catch (errorSheets) {
      // Si no se pudo escribir en el Sheet, liberamos la marca para que un
      // reintento (recargar la página, o el aviso de Mercado Pago) lo vuelva a intentar.
      await liberarDedup(db, claveDedup);
      throw errorSheets;
    }

    if (proveedor === 'paypal' && orderId) {
      await db.collection('pedidos_pendientes_paypal').doc(orderId).delete();
    }

    return res.status(200).json({ ok: true, idEnvio });
  } catch (error) {
    console.error('Error en /api/confirmar-pedido:', error);
    return res.status(500).json({
      error: 'No se pudo confirmar el pedido.',
      message: error.message
    });
  }
}

module.exports = handler;
module.exports.procesarPagoMercadoPago = procesarPagoMercadoPago;