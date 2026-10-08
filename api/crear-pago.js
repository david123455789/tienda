const { MercadoPagoConfig, Preference } = require('mercadopago');
const { obtenerUsuarioDesdeToken } = require('./_firebaseAdmin');

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

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
        title: producto.nombre || 'Producto',
        quantity: Number(producto.cantidad || 1),
        unit_price: Number(producto.precio || 0),
        currency_id: 'MXN'
      }))
      .filter((item) => item.quantity > 0 && item.unit_price > 0);

    const preference = new Preference(client);

    const cuerpoPreferencia = {
      items,
      back_urls: {
        success: `${base}?pago=aprobado`,
        failure: `${base}?pago=fallido`,
        pending: `${base}?pago=pendiente`
      },
      auto_return: 'approved',
      // Mercado Pago avisa aquí cuando el pago se aprueba, aunque el cliente
      // cierre la pestaña antes de volver a la tienda.
      notification_url: `${process.env.URL_BACKEND || 'https://www.inequestrian.com.mx'}/api/webhook-mercadopago`
    };

    // No mandamos datos del comprador (nombre, teléfono, dirección) a Mercado Pago:
    // ya se los pide él mismo en su pantalla de pago, y mandarlos de más puede
    // provocar rechazos. La dirección de entrega viaja en la metadata de abajo.

    // Guardamos aquí quién compró y qué compró (talla/color/grip incluidos)
    // para poder crear el pedido en Sheets cuando confirmemos que sí se pagó.
    let usuario = null;
    try {
      usuario = await obtenerUsuarioDesdeToken(req);
    } catch (error) {
      usuario = null;
    }

    cuerpoPreferencia.metadata = {
      uid: usuario ? usuario.uid : '',
      nombre_cuenta: usuario ? usuario.nombre : '',
      correo_cuenta: usuario ? usuario.email : '',
      productos_json: JSON.stringify(productos),
      direccion_json: JSON.stringify(direccion || {})
    };

    const respuesta = await preference.create({ body: cuerpoPreferencia });

    return res.status(200).json({
      init_point: respuesta.init_point
    });
  } catch (error) {
    return res.status(500).json({
      error: 'No se pudo crear el pago',
      message: error.message
    });
  }
};