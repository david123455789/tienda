const fs = require('fs');
const path = require('path');

const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pub';
const URL_PRODUCTOS = `${BASE}?gid=0&single=true&output=csv`;
const URL_VARIANTES = `${BASE}?gid=1834938244&single=true&output=csv`;
const SITIO = 'https://www.inequestrian.com.mx';
const ARCHIVO = path.join(__dirname, '..', 'catalogo-snapshot.json');
const ARCHIVO_META = path.join(__dirname, '..', 'catalogo-meta.csv');

async function pedir(url) {
  for (let intento = 1; intento <= 4; intento++) {
    try {
      const r = await fetch(url + (intento > 1 ? `&t=${Date.now()}` : ''));
      if (r.ok) {
        const texto = await r.text();
        if (texto.trim().split('\n').length > 1) return texto;
      }
    } catch (e) {}
    await new Promise(res => setTimeout(res, 1500 * intento));
  }
  throw new Error('No se pudo leer ' + url);
}

function filas(csv) {
  return csv.trim().split('\n').length - 1;
}

function parsearCsv(texto) {
  const resultado = [];
  let fila = [];
  let celda = '';
  let comillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const s = texto[i + 1];

    if (c === '"' && comillas && s === '"') { celda += '"'; i++; continue; }
    if (c === '"') { comillas = !comillas; continue; }
    if (c === ',' && !comillas) { fila.push(celda.trim()); celda = ''; continue; }
    if ((c === '\n' || c === '\r') && !comillas) {
      if (c === '\r' && s === '\n') i++;
      fila.push(celda.trim());
      if (fila.some(v => v !== '')) resultado.push(fila);
      fila = [];
      celda = '';
      continue;
    }
    celda += c;
  }

  if (celda !== '' || fila.length) {
    fila.push(celda.trim());
    if (fila.some(v => v !== '')) resultado.push(fila);
  }

  const [encabezados, ...datos] = resultado;
  return datos.map(f => Object.fromEntries(encabezados.map((h, i) => [h, f[i] || ''])));
}

function activo(valor) {
  return String(valor || '').trim().toUpperCase() === 'SI';
}

function absoluta(url) {
  const limpia = String(url || '').trim();
  if (!limpia) return '';
  if (/^https?:\/\//i.test(limpia)) return limpia;
  return `${SITIO}/${limpia.replace(/^\/+/, '')}`;
}

function celdaCsv(valor) {
  const texto = String(valor == null ? '' : valor).replace(/\s*[\r\n]+\s*/g, ' ').trim();
  return /[",]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function crearFeedMeta(csvProductos, csvVariantes) {
  const productos = parsearCsv(csvProductos).filter(p => activo(p.activo));
  const variantes = parsearCsv(csvVariantes).filter(v => activo(v.activo));
  const columnas = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
  const lineas = [columnas.join(',')];

  for (const p of productos) {
    const suyas = variantes.filter(v => v.producto_slug === p.slug);
    const primera = suyas[0];
    const precio = Number(primera ? primera.precio : p.precio);
    const imagen = absoluta(primera ? primera.imagen_url : p.imagen_url);
    const id = p.id || p.slug;

    if (!p.nombre || !id || !p.slug || !(precio > 0) || !imagen) continue;

    const hayStock = suyas.length
      ? suyas.some(v => Number(v.stock) > 0)
      : Number(p.stock) > 0;

    const marca = String(p.categoria || '').trim().toLowerCase() === 'propio' ? 'IN Collection' : 'Maximilian';

    lineas.push([
      id,
      p.nombre,
      p.descripcion || p.nombre,
      hayStock ? 'in stock' : 'out of stock',
      'new',
      `${precio.toFixed(2)} MXN`,
      `${SITIO}/producto?p=${encodeURIComponent(p.slug)}`,
      imagen,
      marca
    ].map(celdaCsv).join(','));
  }

  return lineas.join('\n') + '\n';
}

(async () => {
  const [p, v] = await Promise.all([pedir(URL_PRODUCTOS), pedir(URL_VARIANTES)]);

  if (fs.existsSync(ARCHIVO)) {
    try {
      const anterior = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
      if (filas(p) < filas(anterior.p) * 0.6 || filas(v) < filas(anterior.v) * 0.6) {
        console.log('El catálogo nuevo trae muchas menos filas que el anterior; no se actualiza.');
        return;
      }
    } catch (e) {}
  }

  const nuevo = JSON.stringify({ p, v });
  if (!fs.existsSync(ARCHIVO) || fs.readFileSync(ARCHIVO, 'utf8') !== nuevo) {
    fs.writeFileSync(ARCHIVO, nuevo);
    console.log(`Catálogo actualizado: ${filas(p)} productos, ${filas(v)} variantes.`);
  } else {
    console.log('Sin cambios en el catálogo.');
  }

  const feed = crearFeedMeta(p, v);
  if (!fs.existsSync(ARCHIVO_META) || fs.readFileSync(ARCHIVO_META, 'utf8') !== feed) {
    fs.writeFileSync(ARCHIVO_META, feed);
    console.log(`Feed de Meta actualizado: ${feed.trim().split('\n').length - 1} productos.`);
  }
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});