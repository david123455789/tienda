const { crearPedidoEnSheets } = require('./_sheetsPedidos');

/*
 * Ayudantes para cobrar con el Checkout Transparente de Clip.
 *
 * Variables de entorno necesarias (las sacas de tu panel de desarrollador de Clip):
 *   CLIP_API_KEY     → tu API Key
 *   CLIP_API_SECRET  → tu Clave Secreta (nunca va en el navegador)
 */

const CLIP_API_BASE = 'https://api.payclip.com';

const ORIGENES_PERMITIDOS = [
  'https://david123455789.github.io',
  'https://tienda-alpha-red.vercel.app',
  'https://inequestrian.com.mx',
  'https://www.inequestrian.com.mx',
  'http://localhost:3000'
];

function aplicarCors(req, res, metodos = 'POST, OPTIONS') {
  const origen = req.headers.origin;

  if (origen && ORIGENES_PERMITIDOS.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', metodos);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function encabezadoAutorizacion() {
  const llave = process.env.CLIP_API_KEY;
  const secreto = process.env.CLIP_API_SECRET;

  if (!llave || !secreto) {
    throw new Error('Faltan las variables CLIP_API_KEY y CLIP_API_SECRET en el servidor.');
  }

  return 'Basic ' + Buffer.from(`${llave}:${secreto}`).toString('base64');
}

async function llamarClip(ruta, opciones = {}) {
  const respuesta = await fetch(`${CLIP_API_BASE}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: encabezadoAutorizacion(),
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });

  const texto = await respuesta.text();
  let datos = {};

  try {
    datos = texto ? JSON.parse(texto) : {};
  } catch (error) {
    datos = { message: texto };
  }

  if (!respuesta.ok) {
    const error = new Error(datos.message || datos.error || 'Clip rechazó la operación.');
    error.status = respuesta.status;
    error.detalle = datos;
    throw error;
  }

  return datos;
}

function mensajeRechazo(codigo) {
  const mensajes = {
    'RE-ISS01': 'Tu tarjeta no tiene fondos suficientes.',
    'RE-ISS03': 'Tu tarjeta tiene restricciones. Contacta a tu banco.',
    'RE-ISS07': 'Tu tarjeta está vencida.',
    'RE-ISS16': 'El número de tarjeta no es válido.',
    'RE-3DS01': 'No se pudo validar tu identidad con el banco. Intenta de nuevo.',
    'RE-ERI05': 'Tu comercio aún no completó la verificación de identidad en Clip.'
  };

  return mensajes[codigo] || 'El banco rechazó el pago. Intenta con otra tarjeta o contacta a tu banco.';
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
    // nada que hacer
  }
}

// Crea el pedido en tu Sheet una sola vez por pago, aunque la función se llame dos veces.
async function registrarPedidoUnaVez(db, clave, datosPedido) {
  const esNuevo = await reclamarDedup(db, clave);

  if (!esNuevo) {
    return { repetido: true };
  }

  try {
    const idEnvio = await crearPedidoEnSheets(datosPedido);
    return { idEnvio };
  } catch (error) {
    await liberarDedup(db, clave);
    throw error;
  }
}

module.exports = {
  aplicarCors,
  llamarClip,
  mensajeRechazo,
  registrarPedidoUnaVez
};