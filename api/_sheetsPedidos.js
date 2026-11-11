const { enviarCorreosDePedido } = require('./_correo');
const crypto = require('crypto');
const { calcularEnvio, normalizarTipoEntrega } = require('./_catalogo');

let tokenCache = { valor: null, expira: 0 };

function base64url(datos) {
  return Buffer.from(datos)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function obtenerCredencialServicio() {
  const texto = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!texto) {
    throw new Error('Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT.');
  }

  return JSON.parse(texto);
}

async function obtenerTokenSheets() {
  if (tokenCache.valor && Date.now() < tokenCache.expira - 30000) {
    return tokenCache.valor;
  }

  const credencial = await obtenerCredencialServicio();

  const ahora = Math.floor(Date.now() / 1000);

  const encabezado = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = base64url(JSON.stringify({
    iss: credencial.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600
  }));

  const firma = crypto
    .createSign('RSA-SHA256')
    .update(`${encabezado}.${cuerpo}`)
    .sign(credencial.private_key);

  const jwt = `${encabezado}.${cuerpo}.${base64url(firma)}`;

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error_description || 'No se pudo autenticar con Google Sheets.');
  }

  tokenCache = {
    valor: datos.access_token,
    expira: Date.now() + datos.expires_in * 1000
  };

  return tokenCache.valor;
}

function idHojaPedidos() {
  const id = process.env.PEDIDOS_SHEET_ID;

  if (!id) {
    throw new Error('Falta la variable de entorno PEDIDOS_SHEET_ID.');
  }

  return id;
}

async function agregarFilas(hoja, filas) {
  const token = await obtenerTokenSheets();
  const spreadsheetId = idHojaPedidos();

  const respuesta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(hoja)}!A:Z:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: filas })
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error ? datos.error.message : 'No se pudo escribir en el Sheet de pedidos.');
  }

  return datos;
}

async function leerFilas(hoja) {
  const token = await obtenerTokenSheets();
  const spreadsheetId = idHojaPedidos();

  const respuesta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(hoja)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error ? datos.error.message : 'No se pudo leer el Sheet de pedidos.');
  }

  return datos.values || [];
}

function calcularFilaSiguiente(valores) {
  const ultima = (valores || []).length;
  if (ultima <= 1) return 2;
  return ultima + 2;
}

async function agregarFilasConSeparador(hoja, filas) {
  const columnaA = await leerFilas(`${hoja}!A:A`);
  const fila = calcularFilaSiguiente(columnaA);
  return actualizarCeldas(`${hoja}!A${fila}`, filas);
}

async function actualizarCeldas(rango, filas) {
  const token = await obtenerTokenSheets();
  const spreadsheetId = idHojaPedidos();

  const respuesta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rango)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: filas })
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error ? datos.error.message : 'No se pudo actualizar el Sheet de pedidos.');
  }

  return datos;
}

async function limpiarRango(rango) {
  const token = await obtenerTokenSheets();
  const spreadsheetId = idHojaPedidos();

  const respuesta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rango)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}'
    }
  );

  if (!respuesta.ok) {
    const datos = await respuesta.json();
    throw new Error(datos.error ? datos.error.message : 'No se pudo limpiar el rango.');
  }
}

function fechaPedido() {
  const partes = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());

  const v = tipo => (partes.find(p => p.type === tipo) || {}).value || '';

  return `${v('day')}/${v('month')}/${v('year')} ${v('hour')}:${v('minute')}`;
}

function generarIdEnvio() {
  const fecha = new Date();
  const partes = [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0')
  ].join('');

  const azar = Math.floor(Math.random() * 900 + 100);

  return `PED-${partes}-${azar}`;
}

async function crearPedidoEnSheets({ nombre, correo, telefono, direccion, productos, tipo: tipoEntrega, codigo, descuento: descuentoPedido }) {
  const tipo = normalizarTipoEntrega(tipoEntrega);
  const idEnvio = generarIdEnvio();

  const subtotal = (productos || []).reduce(
    (suma, p) => suma + Number(p.precio || 0) * Number(p.cantidad || 1),
    0
  );
  const envio = (productos || []).length ? calcularEnvio(subtotal, tipo) : 0;
  const descuento = Math.min(Number(descuentoPedido) || 0, subtotal);
  const subtotalCobrado = Number((subtotal - descuento).toFixed(2));

  await agregarFilasConSeparador('Envio', [[
    idEnvio,
    nombre || '',
    correo || '',
    telefono || (direccion ? direccion.telefono : '') || '',
    direccion ? direccion.calle || '' : '',
    direccion ? direccion.numero || '' : '',
    direccion ? direccion.colonia || '' : '',
    direccion ? direccion.ciudad || '' : '',
    direccion ? direccion.cp || '' : '',
    direccion ? direccion.estado || '' : '',
    'Aceptado',
    '', '', '',            
    subtotalCobrado,       
    envio,                 
    subtotalCobrado + envio, 
    fechaPedido(),         
    '',                    
    tipo === 'tienda' ? 'Tienda' : 'Envio', 
    codigo || '',          
    descuento || ''        
  ]]);

  const filasProducto = (productos || []).map(producto => [
    idEnvio,
    producto.nombre || '',
    Number(producto.cantidad || 1),
    producto.talla || '',
    producto.color && producto.color !== 'Único' ? producto.color : '',
    producto.grip || ''
  ]);

  if (filasProducto.length) {
    await agregarFilasConSeparador('Producto', filasProducto);
  }

  try {
    await enviarCorreosDePedido({
      idEnvio,
      nombre,
      correo,
      telefono: telefono || (direccion ? direccion.telefono : '') || '',
      direccion: direccion || {},
      productos: productos || [],
      subtotal,
      descuento,
      codigo: codigo || '',
      envio,
      total: subtotalCobrado + envio,
      tipo
    });
  } catch (error) {
    console.error('Error al enviar correos del pedido:', error);
  }

  return idEnvio;
}

module.exports = { agregarFilasConSeparador, calcularFilaSiguiente, agregarFilas, leerFilas, actualizarCeldas, limpiarRango, crearPedidoEnSheets };