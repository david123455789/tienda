const { obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { procesarPagoMercadoPago } = require('./confirmar-pedido');

/*
 * Mercado Pago le avisa directo a este archivo cuando un pago cambia de estado,
 * aunque el cliente haya cerrado la pestaña antes de volver a la tienda.
 * Nunca confiamos en el aviso en sí: volvemos a consultar el pago directamente
 * con Mercado Pago (usando tu Access Token) antes de crear el pedido.
 */

module.exports = async function handler(req, res) {
  try {
    const query = req.query || {};
    const cuerpo = req.body || {};

    const tipo = cuerpo.type || cuerpo.topic || query.type || query.topic;
    const id = (cuerpo.data && cuerpo.data.id) || query['data.id'] || query.id;

    // Solo nos interesan los avisos de pagos.
    if ((tipo && tipo !== 'payment') || !id) {
      return res.status(200).json({ ignorado: true });
    }

    const db = obtenerFirestoreAdmin();
    const resultado = await procesarPagoMercadoPago(String(id), db);

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error en /api/webhook-mercadopago:', error);
    // Un error 500 hace que Mercado Pago reintente el aviso más tarde.
    return res.status(500).json({ error: error.message });
  }
};