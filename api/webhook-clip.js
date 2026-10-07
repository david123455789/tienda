const { obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { procesarLinkClip } = require('./_clip');

/*
 * Clip le avisa a este archivo cuando un link de pago cambia de estado, aunque el
 * cliente haya cerrado la pestaña o haya pagado en efectivo horas después.
 *
 * El aviso de Clip no trae firma, así que NUNCA confiamos en él: solo lo usamos como
 * señal para volver a preguntarle a Clip, con tus credenciales, si el pago se completó.
 */

module.exports = async function handler(req, res) {
  try {
    const aviso = req.body || {};

    if (aviso.resource !== 'CHECKOUT' || aviso.resource_status !== 'COMPLETED' || !aviso.payment_request_id) {
      return res.status(200).json({ ignorado: true });
    }

    const resultado = await procesarLinkClip(obtenerFirestoreAdmin(), String(aviso.payment_request_id));

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error en /api/webhook-clip:', error);
    // Un error 500 hace que Clip reintente el aviso más tarde.
    return res.status(500).json({ error: error.message });
  }
};