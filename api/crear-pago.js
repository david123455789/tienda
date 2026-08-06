const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const { productos } = req.body;

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

    const respuesta = await preference.create({
      body: {
        items,
        back_urls: {
          success: 'https://tienda-alpha-red.vercel.app/?pago=aprobado',
          failure: 'https://tienda-alpha-red.vercel.app/?pago=fallido',
          pending: 'https://tienda-alpha-red.vercel.app/?pago=pendiente'
        },
        auto_return: 'approved'
      }
    });

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