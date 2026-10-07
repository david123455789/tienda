const { obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { aplicarCors, procesarLinkClip } = require('./_clip');

/*
 * Se llama cuando el cliente regresa a tu tienda después de pagar en Clip.
 * Nunca confía en el navegador: le pregunta a Clip si el pago de verdad se completó.
 */

module.exports = async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const { paymentRequestId } = req.body || {};

    if (!paymentRequestId) {
      return res.status(400).json({ mensaje: 'Falta el identificador del pago.' });
    }

    const resultado = await procesarLinkClip(obtenerFirestoreAdmin(), String(paymentRequestId));

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error en /api/confirmar-link-clip:', error);
    return res.status(error.status || 500).json({
      ok: false,
      mensaje: 'No se pudo confirmar el pago.',
      detalle: error.message
    });
  }
};