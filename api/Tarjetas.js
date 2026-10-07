const { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin } = require('./_firebaseAdmin');

/*
 * Guarda, lista y borra tarjetas usando el "vault" de Mercado Pago (Customers & Cards).
 *
 * IMPORTANTE: este archivo NUNCA recibe ni guarda el número completo de la
 * tarjeta ni el código de seguridad. Eso viaja directo del navegador del
 * cliente a Mercado Pago (con los "campos seguros" de su SDK) y aquí solo
 * llega un "token" de un solo uso que Mercado Pago genera para representar
 * esa tarjeta. Nosotros solo guardamos el ID de esa tarjeta dentro de
 * Mercado Pago, los últimos 4 dígitos y la marca (Visa, Mastercard, etc.) —
 * nada de eso sirve para cobrar nada por sí solo.
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

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function llamarMercadoPago(ruta, opciones = {}) {
  const respuesta = await fetch(`https://api.mercadopago.com${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });

  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : {};

  if (!respuesta.ok) {
    const error = new Error(datos.message || 'Mercado Pago rechazó la operación.');
    error.status = respuesta.status;
    error.detalle = datos;
    throw error;
  }

  return datos;
}

async function obtenerOCrearClienteMP(uid, email) {
  const db = obtenerFirestoreAdmin();
  const refUsuario = db.collection('usuarios').doc(uid);
  const snap = await refUsuario.get();
  const existente = snap.exists ? snap.data().mpCustomerId : null;

  if (existente) {
    return existente;
  }

  const busqueda = await llamarMercadoPago(
    `/v1/customers/search?email=${encodeURIComponent(email)}`
  );

  let customerId = busqueda.results && busqueda.results[0] ? busqueda.results[0].id : null;

  if (!customerId) {
    const nuevo = await llamarMercadoPago('/v1/customers', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    customerId = nuevo.id;
  }

  await refUsuario.set({ mpCustomerId: customerId }, { merge: true });

  return customerId;
}

function resumenTarjeta(tarjeta) {
  return {
    id: tarjeta.id,
    ultimosDigitos: tarjeta.last_four_digits,
    marca: tarjeta.payment_method ? tarjeta.payment_method.name : '',
    mesVencimiento: tarjeta.expiration_month,
    anioVencimiento: tarjeta.expiration_year,
    titular: tarjeta.cardholder ? tarjeta.cardholder.name : ''
  };
}

module.exports = async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  let usuario;

  try {
    usuario = await obtenerUsuarioDesdeToken(req);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  try {
    const customerId = await obtenerOCrearClienteMP(usuario.uid, usuario.email);

    if (req.method === 'GET') {
      const lista = await llamarMercadoPago(`/v1/customers/${customerId}/cards`);
      return res.status(200).json((lista || []).map(resumenTarjeta));
    }

    if (req.method === 'POST') {
      const { token } = req.body || {};

      if (!token) {
        return res.status(400).json({ error: 'Falta el token de la tarjeta.' });
      }

      const tarjeta = await llamarMercadoPago(`/v1/customers/${customerId}/cards`, {
        method: 'POST',
        body: JSON.stringify({ token })
      });

      return res.status(200).json(resumenTarjeta(tarjeta));
    }

    if (req.method === 'DELETE') {
      const cardId = req.body && req.body.cardId;

      if (!cardId) {
        return res.status(400).json({ error: 'Falta el id de la tarjeta.' });
      }

      await llamarMercadoPago(`/v1/customers/${customerId}/cards/${cardId}`, {
        method: 'DELETE'
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Metodo no permitido' });
  } catch (error) {
    console.error('Error en /api/tarjetas:', error);
    return res.status(error.status || 500).json({
      error: 'No se pudo completar la operación con tu tarjeta.',
      message: error.message
    });
  }
};