const { obtenerFirestoreAdmin } = require('./_firebaseAdmin');
const { leerFilas, agregarFilas, limpiarRango } = require('./_sheetsPedidos');

/*
 * Página temporal de diagnóstico: abre /api/diagnostico-pedidos en el navegador
 * y te dice qué parte del sistema de pedidos falla. Agrega ?escribir=1 para
 * probar también el permiso de escritura (escribe una fila de prueba y la borra).
 * No muestra ninguna clave ni dato de clientes.
 *
 * IMPORTANTE: borra este archivo cuando termines de revisar.
 */

async function paso(resultado, nombre, funcion) {
  try {
    const detalle = await funcion();
    resultado.pasos.push({ paso: nombre, ok: true, detalle: detalle || '' });
  } catch (error) {
    resultado.pasos.push({ paso: nombre, ok: false, error: error.message });
  }
}

module.exports = async function handler(req, res) {
  const resultado = {
    variables: {
      FIREBASE_SERVICE_ACCOUNT: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
      PEDIDOS_SHEET_ID: Boolean(process.env.PEDIDOS_SHEET_ID),
      MERCADO_PAGO_ACCESS_TOKEN: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
    },
    pasos: []
  };

  await paso(resultado, 'La cuenta de servicio de Firebase es un JSON válido', async () => {
    const datos = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '');
    if (!datos.client_email || !datos.private_key) {
      throw new Error('Al JSON le falta client_email o private_key.');
    }
    return 'Correcto';
  });

  await paso(resultado, 'Conexión a Firestore', async () => {
    const db = obtenerFirestoreAdmin();
    const lista = await db.collection('pedidos_creados').limit(20).get();
    return `Pagos ya registrados: ${lista.size}`;
  });

  await paso(resultado, 'Leer la hoja "Envio"', async () => {
    const filas = await leerFilas('Envio');
    return `Filas (con encabezado): ${filas.length}`;
  });

  await paso(resultado, 'Leer la hoja "Producto"', async () => {
    const filas = await leerFilas('Producto');
    return `Filas (con encabezado): ${filas.length}`;
  });

  if (req.query && req.query.escribir === '1') {
    await paso(resultado, 'Escribir en la hoja "Envio" (fila de prueba que se borra)', async () => {
      const respuesta = await agregarFilas('Envio', [['PRUEBA-DIAGNOSTICO']]);
      const rango = respuesta.updates && respuesta.updates.updatedRange;
      if (rango) await limpiarRango(rango);
      return 'Tienes permiso de Editor';
    });
  }

  res.status(200).json(resultado);
};