// Cotizaciones de envío con Envia.com (https://docs.envia.com).
// Solo es para uso interno de la tienda: el cliente sigue pagando el envío fijo.
//
// Variables de entorno en Vercel:
//   ENVIA_TOKEN        (obligatoria) token de API de Envia (el de pruebas o el de producción)
//   ENVIA_URL          (opcional) por defecto https://api-test.envia.com  (pruebas).
//                      Para producción: https://api.envia.com
//   ENVIA_PAQUETERIAS  (opcional) lista separada por comas. Por defecto: dhl,fedex,estafeta,paquetexpress,redpack
// Si falta ENVIA_TOKEN, simplemente no se cotiza (el pedido se registra igual).

const ORIGEN = {
  name: 'In Equestrian Shop',
  company: 'In Equestrian Shop',
  email: 'contacto@in-equestrian.com',
  phone: '+522219395055',
  street: 'Prol. Paseo de la Reforma',
  number: '413',
  district: 'Zedec Santa Fe',
  city: 'Ciudad de Mexico',
  state: 'CX',
  country: 'MX',
  postalCode: '01219'
};

// Caja estándar (una sudadera es lo más voluminoso). El peso sube un poco por cada pieza extra.
const CAJA = { largo: 35, ancho: 30, alto: 12, pesoBase: 1.5, pesoPorPiezaExtra: 0.8, pesoMaximo: 20 };

const TIEMPO_MAXIMO_MS = 4500;

const ESTADOS = {
  'aguascalientes': 'AG', 'baja california': 'BC', 'baja california sur': 'BS', 'campeche': 'CM',
  'chiapas': 'CS', 'chihuahua': 'CH', 'ciudad de mexico': 'CX', 'cdmx': 'CX', 'distrito federal': 'CX', 'df': 'CX',
  'coahuila': 'CO', 'colima': 'CL', 'durango': 'DG', 'guanajuato': 'GT', 'guerrero': 'GR', 'hidalgo': 'HG',
  'jalisco': 'JA', 'estado de mexico': 'EM', 'mexico': 'EM', 'edomex': 'EM', 'michoacan': 'MI', 'morelos': 'MO',
  'nayarit': 'NA', 'nuevo leon': 'NL', 'oaxaca': 'OA', 'puebla': 'PU', 'queretaro': 'QT', 'quintana roo': 'QR',
  'san luis potosi': 'SL', 'sinaloa': 'SI', 'sonora': 'SO', 'tabasco': 'TB', 'tamaulipas': 'TM',
  'tlaxcala': 'TL', 'veracruz': 'VE', 'yucatan': 'YU', 'zacatecas': 'ZA'
};

function sinAcentos(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function codigoEstado(nombre) {
  const clave = sinAcentos(nombre)
    .replace(/^estado de (?!mexico)/, '')
    .replace(/ de ignacio de la llave$/, '')
    .replace(/ de ocampo$/, '')
    .replace(/ de zaragoza$/, '')
    .replace(/ de ocampo$/, '');
  return ESTADOS[clave] || ESTADOS[sinAcentos(nombre)] || String(nombre || '').trim();
}

function telefonoMx(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  return digitos.length >= 10 ? '+52' + digitos.slice(-10) : '+522219395055';
}

function armarSolicitud(pedido, paqueteria) {
  const d = pedido.direccion || {};
  const piezas = (pedido.productos || []).reduce((suma, p) => suma + Number(p.cantidad || 1), 0) || 1;
  const peso = Math.min(CAJA.pesoMaximo, CAJA.pesoBase + CAJA.pesoPorPiezaExtra * (piezas - 1));

  return {
    origin: ORIGEN,
    destination: {
      name: pedido.nombre || 'Cliente',
      phone: telefonoMx(pedido.telefono || d.telefono),
      street: d.calle || '-',
      number: d.numero || 'S/N',
      district: d.colonia || '-',
      city: d.ciudad || '-',
      state: codigoEstado(d.estado),
      country: 'MX',
      postalCode: String(d.cp || '').trim()
    },
    packages: [{
      type: 'box',
      content: 'Ropa',
      amount: 1,
      declaredValue: Number(pedido.subtotal || 0),
      lengthUnit: 'CM',
      weightUnit: 'KG',
      weight: peso,
      dimensions: { length: CAJA.largo, width: CAJA.ancho, height: CAJA.alto }
    }],
    shipment: { type: 1, carrier: paqueteria }
  };
}

async function cotizarUnaPaqueteria(pedido, paqueteria) {
  const base = (process.env.ENVIA_URL || 'https://api-test.envia.com').replace(/\/+$/, '');
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);

  try {
    const respuesta = await fetch(`${base}/ship/rate/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ENVIA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(armarSolicitud(pedido, paqueteria)),
      signal: control.signal
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok || datos.meta === 'error' || !Array.isArray(datos.data)) {
      const motivo = (datos.error && (datos.error.message || datos.error.description)) || `HTTP ${respuesta.status}`;
      console.warn(`Envia (${paqueteria}): sin cotización. ${motivo}`);
      return [];
    }

    return datos.data
      .filter(r => Number(r.totalPrice) > 0)
      .map(r => ({
        paqueteria: String(r.carrierDescription || r.carrier || paqueteria),
        servicio: String(r.serviceDescription || r.service || ''),
        precio: Number(r.totalPrice),
        moneda: r.currency || 'MXN',
        entrega: r.deliveryEstimate || ''
      }));
  } catch (error) {
    console.warn(`Envia (${paqueteria}): ${error.name === 'AbortError' ? 'tardó demasiado' : error.message}`);
    return [];
  } finally {
    clearTimeout(reloj);
  }
}

// Devuelve todas las opciones encontradas, de la más barata a la más cara. Nunca lanza error.
async function cotizarEnvios(pedido) {
  if (!process.env.ENVIA_TOKEN) {
    console.warn('Cotización de envío desactivada: falta ENVIA_TOKEN.');
    return [];
  }

  try {
    const lista = (process.env.ENVIA_PAQUETERIAS || 'dhl,fedex,estafeta,paquetexpress,redpack')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);

    const resultados = await Promise.all(lista.map(p => cotizarUnaPaqueteria(pedido, p)));
    const opciones = resultados.flat().sort((a, b) => a.precio - b.precio);

    console.log(`Envia: ${opciones.length} opciones de envío para el pedido.`);
    return opciones;
  } catch (error) {
    console.error('Error al cotizar envío:', error.message);
    return [];
  }
}

function dinero(valor) {
  return '$' + Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Texto corto para la celda del Sheet.
function resumenCotizaciones(opciones) {
  if (!opciones.length) return 'Sin cotización';
  return opciones
    .slice(0, 6)
    .map(o => `${o.paqueteria} ${o.servicio} ${dinero(o.precio)}${o.entrega ? ' (' + o.entrega + ')' : ''}`)
    .join(' | ');
}

// Texto corto para la columna T de "Envio": solo la opción más barata.
function resumenMasBarata(opciones) {
  if (!opciones.length) return 'Sin cotización';
  const o = opciones[0];
  return `${o.paqueteria} ${o.servicio} ${dinero(o.precio)}${o.entrega ? ' (' + o.entrega + ')' : ''} · ${opciones.length} opciones en la hoja Cotizaciones`;
}

module.exports = { cotizarEnvios, resumenCotizaciones, resumenMasBarata };