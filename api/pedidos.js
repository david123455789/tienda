const { obtenerUsuarioDesdeToken } = require('./_firebaseAdmin');
const { leerFilas } = require('./_sheetsPedidos');

/*
 * Lista los pedidos del cliente que inició sesión, leyendo directo tu Sheet
 * "Pedidos" (hojas "Envio" y "Producto"). El estatus que ve el cliente es el
 * que tú pones a mano en la columna "Estatus" de la hoja "Envio".
 */

const ORIGENES_PERMITIDOS = [
  'https://david123455789.github.io',
  'https://tienda-alpha-red.vercel.app',
  'https://inequestrian.com.mx',
  'https://www.inequestrian.com.mx',
  'http://localhost:3000'
];

function aplicarCors(req, res) {
  const origen = req.headers.origin;

  if (origen && ORIGENES_PERMITIDOS.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Columnas de la hoja "Envio":
// A=ID ENVIO B=Nombre C=Correo D=Numero E=Calle F=Numero G=Colonia H=Ciudad I=CP J=Estado K=Estatus
const COL_ENVIO = {
  id: 0, nombre: 1, correo: 2, telefono: 3, calle: 4, numero: 5,
  colonia: 6, ciudad: 7, cp: 8, estado: 9, estatus: 10
};

// Columnas de la hoja "Producto":
// A=ID Envio B=Nombre producto C=Cantidad D=Talla E=Color F=Grip
const COL_PRODUCTO = { idEnvio: 0, nombre: 1, cantidad: 2, talla: 3, color: 4, grip: 5 };

module.exports = async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  let usuario;

  try {
    usuario = await obtenerUsuarioDesdeToken(req);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  try {
    const [filasEnvio, filasProducto] = await Promise.all([
      leerFilas('Envio'),
      leerFilas('Producto')
    ]);

    const correo = (usuario.email || '').trim().toLowerCase();

    const misEnvios = filasEnvio
      .slice(1) // quita el encabezado
      .filter(fila => (fila[COL_ENVIO.correo] || '').trim().toLowerCase() === correo);

    const pedidos = misEnvios.map(fila => {
      const idEnvio = fila[COL_ENVIO.id] || '';

      const productos = filasProducto
        .slice(1)
        .filter(filaProducto => filaProducto[COL_PRODUCTO.idEnvio] === idEnvio)
        .map(filaProducto => ({
          nombre: filaProducto[COL_PRODUCTO.nombre] || '',
          cantidad: filaProducto[COL_PRODUCTO.cantidad] || '',
          talla: filaProducto[COL_PRODUCTO.talla] || '',
          color: filaProducto[COL_PRODUCTO.color] || '',
          grip: filaProducto[COL_PRODUCTO.grip] || ''
        }));

      return {
        idEnvio,
        estatus: fila[COL_ENVIO.estatus] || 'Aceptado',
        direccion: {
          calle: fila[COL_ENVIO.calle] || '',
          numero: fila[COL_ENVIO.numero] || '',
          colonia: fila[COL_ENVIO.colonia] || '',
          ciudad: fila[COL_ENVIO.ciudad] || '',
          cp: fila[COL_ENVIO.cp] || '',
          estado: fila[COL_ENVIO.estado] || ''
        },
        productos
      };
    });

    // Los IDs se generan con la fecha por delante, así que ordenarlos al
    // revés deja primero los pedidos más recientes.
    pedidos.sort((a, b) => (a.idEnvio < b.idEnvio ? 1 : -1));

    return res.status(200).json(pedidos);
  } catch (error) {
    console.error('Error en /api/pedidos:', error);
    return res.status(500).json({
      error: 'No se pudieron cargar tus pedidos.',
      message: error.message
    });
  }
};