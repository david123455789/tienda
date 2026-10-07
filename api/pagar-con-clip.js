const { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { validarProductos } = require('./_catalogo');
const { aplicarCors, llamarClip, mensajeRechazo, registrarPedidoUnaVez } = require('./_clip');

/*
 * Cobra con el Checkout Transparente de Clip.
 *
 * El navegador solo manda un "token" de la tarjeta (el número completo nunca llega
 * aquí). El monto lo calcula este servidor desde tu catálogo, no el navegador.
 */

function soloDigitos(valor) {
  return String(valor || '').replace(/\D/g, '').slice(-10);
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
    return res.status(error.status || 401).json({ mensaje: error.message });
  }

  try {
    const { token, productos, direccion, prevention_data: prevencion } = req.body || {};

    if (!token) {
      return res.status(400).json({ mensaje: 'Falta el token de la tarjeta.' });
    }

    if (!direccion || !direccion.calle || !direccion.cp) {
      return res.status(400).json({ mensaje: 'Falta la dirección de entrega.' });
    }

    const verificado = await validarProductos(productos);

    const descripcion = verificado.productos
      .map(producto => producto.nombre)
      .join(', ')
      .slice(0, 100);

    const cuerpo = {
      amount: verificado.total,
      currency: 'MXN',
      description: descripcion || 'Compra en In Equestrian Shop',
      payment_method: { token },
      customer: {
        email: usuario.email,
        phone: soloDigitos(direccion.telefono),
        address: {
          postal_code: String(direccion.cp),
          street: String(direccion.calle),
          number: String(direccion.numero || '')
        }
      }
    };

    if (prevencion && prevencion.session_id) {
      cuerpo.prevention_data = {
        session_id: prevencion.session_id,
        user_agent: prevencion.user_agent,
        device_finger_print_token: prevencion.session_id
      };
    }

    const pago = await llamarClip('/payments', {
      method: 'POST',
      body: JSON.stringify(cuerpo)
    });

    const db = obtenerFirestoreAdmin();

    const datosPedido = {
      nombre: usuario.nombre,
      correo: usuario.email,
      telefono: direccion.telefono || '',
      direccion,
      productos: verificado.productos
    };

    if (pago.status === 'approved') {
      const resultado = await registrarPedidoUnaVez(db, `clip_${pago.id}`, datosPedido);

      return res.status(200).json({
        ok: true,
        estatus: 'approved',
        idPago: pago.id,
        idEnvio: resultado.idEnvio || null
      });
    }

    const codigo = pago.status_detail && pago.status_detail.code;

    if (pago.status === 'pending' && codigo === 'PE-3DS01' && pago.pending_action) {
      // El banco pide validar la identidad (3DS). Guardamos lo que se compró para
      // poder crear el pedido cuando se confirme que el pago sí se aprobó.
      await db.collection('pedidos_pendientes_clip').doc(pago.id).set({
        uid: usuario.uid,
        datosPedido,
        total: verificado.total,
        creado: Date.now()
      });

      return res.status(200).json({
        ok: false,
        requiere3ds: true,
        url: pago.pending_action.url,
        paymentId: pago.id
      });
    }

    if (pago.status === 'rejected') {
      return res.status(200).json({ ok: false, mensaje: mensajeRechazo(codigo) });
    }

    return res.status(200).json({
      ok: false,
      mensaje: 'No se pudo completar el pago. Intenta de nuevo o usa otro método.'
    });
  } catch (error) {
    console.error('Error en /api/pagar-con-clip:', error);

    if (error.paraCliente) {
      return res.status(error.status || 400).json({ mensaje: error.message });
    }

    return res.status(500).json({
      mensaje: 'No se pudo procesar el pago. Intenta de nuevo en unos minutos.',
      detalle: error.message
    });
  }
};