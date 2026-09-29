const crypto = require('crypto');
const { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin } = require('./_firebaseAdmin');

/*
 * Cobra usando una tarjeta ya guardada en Mercado Pago. El navegador vuelve a
 * pedir el CVV (Mercado Pago lo exige por seguridad para no reutilizar una
 * tarjeta sin que el dueño confirme que la tiene en mano) y genera un token
 * nuevo de un solo uso; aquí solo llega ese token, nunca el número de tarjeta.
 */

const ORIGENES_PERMITIDOS = [
  'https://david123455789.github.io',
  'https://tienda-alpha-red.vercel.app',
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

module.exports = async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  let usuario;

  try {
    usuario = await obtenerUsuarioDesdeToken(req);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  try {
    const { token, productos, direccion } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Falta confirmar el CVV de la tarjeta.' });
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Carrito vacio' });
    }

    const db = obtenerFirestoreAdmin();
    const snap = await db.collection('usuarios').doc(usuario.uid).get();
    const customerId = snap.exists ? snap.data().mpCustomerId : null;

    if (!customerId) {
      return res.status(400).json({ error: 'No encontramos tarjetas guardadas en tu cuenta.' });
    }

    const total = productos.reduce(
      (suma, producto) => suma + Number(producto.precio || 0) * Number(producto.cantidad || 1),
      0
    );

    if (total <= 0) {
      return res.status(400).json({ error: 'El total de la compra no es válido.' });
    }

    const descripcion = productos.map((producto) => producto.nombre).join(', ').slice(0, 250);

    const pago = await llamarMercadoPago('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        transaction_amount: Number(total.toFixed(2)),
        token,
        description: descripcion || 'Compra en In Equestrian Shop',
        installments: 1,
        capture: true,
        payer: {
          type: 'customer',
          id: customerId,
          email: usuario.email
        },
        metadata: { direccion: direccion || null }
      })
    });

    if (pago.status !== 'approved') {
      return res.status(200).json({
        ok: false,
        estatus: pago.status,
        mensaje:
          pago.status === 'in_process'
            ? 'Tu pago está siendo revisado por Mercado Pago.'
            : 'El pago no fue aprobado. Intenta con otra tarjeta.'
      });
    }

    return res.status(200).json({ ok: true, estatus: pago.status, idPago: pago.id });
  } catch (error) {
    console.error('Error en /api/pagar-con-tarjeta:', error);
    return res.status(error.status || 500).json({
      error: 'No se pudo procesar el pago.',
      message: error.message
    });
  }
};