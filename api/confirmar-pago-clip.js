const { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { aplicarCors, llamarClip, mensajeRechazo, registrarPedidoUnaVez } = require('./_clip');

/*
 * Se llama cuando el cliente termina la validación 3DS de su banco. Nunca confiamos
 * en lo que diga el navegador: volvemos a preguntarle a Clip si el pago de verdad se
 * aprobó, y solo entonces creamos el pedido con los datos que guardamos al cobrar.
 */

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
    return res.status(error.status || 401).json({ mensaje: error.message });
  }

  try {
    const { paymentId } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({ mensaje: 'Falta el identificador del pago.' });
    }

    const db = obtenerFirestoreAdmin();
    const referencia = db.collection('pedidos_pendientes_clip').doc(String(paymentId));
    const pendiente = await referencia.get();

    if (!pendiente.exists || pendiente.data().uid !== usuario.uid) {
      return res.status(404).json({ mensaje: 'No encontramos ese pago en tu cuenta.' });
    }

    const pago = await llamarClip(`/payments/${encodeURIComponent(paymentId)}`);

    if (pago.status === 'approved') {
      const resultado = await registrarPedidoUnaVez(
        db,
        `clip_${paymentId}`,
        pendiente.data().datosPedido
      );

      await referencia.delete();

      return res.status(200).json({ ok: true, idEnvio: resultado.idEnvio || null });
    }

    if (pago.status === 'rejected' || pago.status === 'cancelled') {
      await referencia.delete();

      const codigo = pago.status_detail && pago.status_detail.code;
      return res.status(200).json({ ok: false, mensaje: mensajeRechazo(codigo) });
    }

    return res.status(200).json({
      ok: false,
      mensaje: 'Tu pago todavía se está validando. Revisa "Mis pedidos" en unos minutos.'
    });
  } catch (error) {
    console.error('Error en /api/confirmar-pago-clip:', error);
    return res.status(500).json({
      mensaje: 'No se pudo confirmar el pago.',
      detalle: error.message
    });
  }
};