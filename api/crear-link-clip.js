const { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { validarProductos } = require('./_catalogo');
const { aplicarCors, llamarClip, urlBaseSegura } = require('./_clip');

/*
 * Crea un link de pago de Clip con el monto EXACTO del pedido. El cliente paga en la
 * página de Clip (tarjeta, efectivo en OXXO o Mi Clip) y regresa a tu tienda.
 *
 * El monto lo calcula este servidor desde tu catálogo, no el navegador. Cuando Clip
 * avisa que el pago se completó, otro archivo (webhook-clip.js) crea el pedido.
 */

function soloDigitos(valor) {
  return String(valor || '').replace(/\D/g, '').slice(-10);
}

function nombreSeguro(nombre) {
  return String(nombre || '')
    .replace(/[^\p{L}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function referenciaPedido() {
  // Clip solo permite letras, números, guion medio y guion bajo (máximo 36 caracteres).
  return `IES-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
    const { productos, direccion, urlRetorno } = req.body || {};

    if (!direccion || !direccion.calle || !direccion.cp) {
      return res.status(400).json({ mensaje: 'Falta la dirección de entrega.' });
    }

    const verificado = await validarProductos(productos);

    if (verificado.total < 1) {
      return res.status(400).json({ mensaje: 'El monto mínimo para pagar con Clip es de $1.00.' });
    }

    const base = urlBaseSegura(urlRetorno);
    const urlBackend = process.env.URL_BACKEND || 'https://www.inequestrian.com.mx';

    const descripcion = verificado.productos
      .map(producto => `${producto.nombre} x${producto.cantidad}`)
      .join(', ')
      .replace(/[^\p{L}\p{N}\s.,x\-]/gu, '')
      .slice(0, 240) || 'Compra en In Equestrian Shop';

    const cuerpoBase = {
      amount: verificado.total,
      currency: 'MXN',
      purchase_description: descripcion,
      redirection_url: {
        success: `${base}?pago=clip`,
        error: `${base}?pago=clip_error`,
        default: base
      },
      custom_payment_options: {
        payment_method_types: ['debit', 'credit', 'cash']
      },
      webhook_url: `${urlBackend}/api/webhook-clip`
    };

    const metadataBase = { external_reference: referenciaPedido() };

    const conCliente = {
      ...cuerpoBase,
      metadata: {
        ...metadataBase,
        customer_info: {
          name: nombreSeguro(direccion.nombre || usuario.nombre),
          email: usuario.email,
          phone: Number(soloDigitos(direccion.telefono)) || undefined
        }
      }
    };

    let link;

    try {
      link = await llamarClip('/v2/checkout', {
        method: 'POST',
        body: JSON.stringify(conCliente)
      });
    } catch (error) {
      // Si Clip rechazó los datos del cliente (formato raro en nombre o teléfono),
      // reintentamos sin ellos: el cliente los escribe en la página de Clip.
      if (error.status !== 400) throw error;

      link = await llamarClip('/v2/checkout', {
        method: 'POST',
        body: JSON.stringify({ ...cuerpoBase, metadata: metadataBase })
      });
    }

    if (!link.payment_request_url || !link.payment_request_id) {
      throw new Error('Clip no devolvió el link de pago.');
    }

    // Guardamos lo que se compró para crear el pedido cuando Clip avise que ya se pagó.
    const db = obtenerFirestoreAdmin();

    await db.collection('pedidos_pendientes_clip_link').doc(link.payment_request_id).set({
      uid: usuario.uid,
      total: verificado.total,
      creado: Date.now(),
      datosPedido: {
        nombre: usuario.nombre,
        correo: usuario.email,
        telefono: direccion.telefono || '',
        direccion,
        productos: verificado.productos
      }
    });

    return res.status(200).json({
      ok: true,
      url: link.payment_request_url,
      paymentRequestId: link.payment_request_id
    });
  } catch (error) {
    console.error('Error en /api/crear-link-clip:', error);

    if (error.paraCliente) {
      return res.status(error.status || 400).json({ mensaje: error.message });
    }

    return res.status(500).json({
      mensaje: 'No se pudo generar el link de pago. Intenta de nuevo en unos minutos.',
      detalle: error.message
    });
  }
};