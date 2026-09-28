const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

const ORIGENES_PERMITIDOS = [
  'https://david123455789.github.io',
  'https://tienda-alpha-red.vercel.app',
  'http://localhost:3000'
];

const URL_RETORNO_POR_DEFECTO = 'https://tienda-alpha-red.vercel.app/';

function aplicarCors(req, res) {
  const origen = req.headers.origin;

  if (origen && ORIGENES_PERMITIDOS.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      auto_return: 'approved'
    };

    if (direccion && (direccion.nombre || direccion.telefono)) {
      cuerpoPreferencia.payer = {
        name: direccion.nombre || undefined,
        phone: direccion.telefono ? { number: direccion.telefono } : undefined,
        address: direccion.calle
          ? {
              street_name: direccion.calle,
              zip_code: direccion.cp || undefined
            }
          : undefined
      };
    }

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