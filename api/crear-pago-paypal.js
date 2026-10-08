const { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin } = require('./_firebaseAdmin');

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

async function obtenerTokenPaypal() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Faltan las credenciales de PayPal (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).');
  }

  const credenciales = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const respuesta = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credenciales}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error_description || 'No se pudo autenticar con PayPal.');
  }

  return datos.access_token;
}

const ORIGENES_PERMITIDOS = [
  'https://david123455789.github.io',
  'https://tienda-alpha-red.vercel.app',
  'https://inequestrian.com.mx',
  'https://www.inequestrian.com.mx',
  'http://localhost:3000'
];

const URL_RETORNO_POR_DEFECTO = 'https://www.inequestrian.com.mx/';

function aplicarCors(req, res) {
  const origen = req.headers.origin;

  if (origen && ORIGENES_PERMITIDOS.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function obtenerUrlRetorno(urlRetorno) {
  try {
    const url = new URL(urlRetorno);

    if (ORIGENES_PERMITIDOS.includes(url.origin)) {
      return url.origin + url.pathname;
    }
  } catch (error) {
    // se usa la URL por defecto
  }

  return URL_RETORNO_POR_DEFECTO;
}

module.exports = async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const { productos, direccion, urlRetorno } = req.body;
    const base = obtenerUrlRetorno(urlRetorno);

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Carrito vacio' });
    }

    const items = productos
      .map((producto) => ({
        name: String(producto.nombre || 'Producto').slice(0, 127),
        quantity: String(Number(producto.cantidad || 1)),
        unit_amount: {
          currency_code: 'MXN',
          value: Number(producto.precio || 0).toFixed(2)
        }
      }))
      .filter((item) => Number(item.quantity) > 0 && Number(item.unit_amount.value) > 0);

    if (!items.length) {
      return res.status(400).json({ error: 'Carrito vacio' });
    }

    const totalItems = items.reduce(
      (suma, item) => suma + Number(item.unit_amount.value) * Number(item.quantity),
      0
    );

    const token = await obtenerTokenPaypal();

    const purchaseUnit = {
      amount: {
        currency_code: 'MXN',
        value: totalItems.toFixed(2),
        breakdown: {
          item_total: {
            currency_code: 'MXN',
            value: totalItems.toFixed(2)
          }
        }
      },
      items
    };

    if (direccion && direccion.calle) {
      purchaseUnit.shipping = {
        name: { full_name: direccion.nombre || undefined },
        address: {
          address_line_1: direccion.calle,
          admin_area_2: direccion.ciudad || undefined,
          admin_area_1: direccion.estado || undefined,
          postal_code: direccion.cp || undefined,
          country_code: 'MX'
        }
      };
    }

    const respuestaOrden = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [purchaseUnit],
        application_context: {
          brand_name: 'In Equestrian Shop',
          return_url: `${base}?pago=aprobado`,
          cancel_url: `${base}?pago=cancelado`,
          user_action: 'PAY_NOW'
        }
      })
    });

    const orden = await respuestaOrden.json();

    if (!respuestaOrden.ok) {
      throw new Error(orden.message || 'No se pudo crear la orden de PayPal.');
    }

    const linkAprobacion = (orden.links || []).find((link) => link.rel === 'approve');

    if (!linkAprobacion) {
      throw new Error('PayPal no devolvió un link de aprobación.');
    }

    // PayPal no tiene un campo de metadata grande como Mercado Pago, así que
    // guardamos aquí qué se compró y a quién pertenece, para poder crear el
    // pedido en Sheets cuando confirmemos que el pago sí se completó.
    let usuario = null;
    try {
      usuario = await obtenerUsuarioDesdeToken(req);
    } catch (error) {
      usuario = null;
    }

    const db = obtenerFirestoreAdmin();
    await db.collection('pedidos_pendientes_paypal').doc(orden.id).set({
      uid: usuario ? usuario.uid : '',
      nombre_cuenta: usuario ? usuario.nombre : '',
      correo_cuenta: usuario ? usuario.email : '',
      productos,
      direccion: direccion || {},
      creado: Date.now()
    });

    return res.status(200).json({
      init_point: linkAprobacion.href
    });
  } catch (error) {
    return res.status(500).json({
      error: 'No se pudo crear el pago con PayPal',
      message: error.message
    });
  }
};