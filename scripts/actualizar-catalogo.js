// Descarga el catálogo (Productos y Variantes) de Google Sheets y lo guarda en catalogo-snapshot.json.
// La tienda lo carga desde su propio servidor (muy rápido) y después lo actualiza con el Sheet en vivo.
// Lo ejecuta GitHub Actions cada 30 minutos (ver .github/workflows/catalogo.yml).
// También puedes correrlo a mano:  node scripts/actualizar-catalogo.js

const fs = require('fs');
const path = require('path');

const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pub';
const URL_PRODUCTOS = `${BASE}?gid=0&single=true&output=csv`;
const URL_VARIANTES = `${BASE}?gid=1834938244&single=true&output=csv`;
const ARCHIVO = path.join(__dirname, '..', 'catalogo-snapshot.json');

async function pedir(url) {
  for (let intento = 1; intento <= 4; intento++) {
    try {
      const r = await fetch(url + (intento > 1 ? `&t=${Date.now()}` : ''));
      if (r.ok) {
        const texto = await r.text();
        if (texto.trim().split('\n').length > 1) return texto;
      }
    } catch (e) { /* se reintenta */ }
    await new Promise(res => setTimeout(res, 1500 * intento));
  }
  throw new Error('No se pudo leer ' + url);
}

function filas(csv) {
  return csv.trim().split('\n').length - 1;
}

(async () => {
  const [p, v] = await Promise.all([pedir(URL_PRODUCTOS), pedir(URL_VARIANTES)]);

  // Seguridad: si el Sheet llegó incompleto (mucho más corto que el catálogo anterior), no se reemplaza.
  if (fs.existsSync(ARCHIVO)) {
    try {
      const anterior = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
      if (filas(p) < filas(anterior.p) * 0.6 || filas(v) < filas(anterior.v) * 0.6) {
        console.log('El catálogo nuevo trae muchas menos filas que el anterior; no se actualiza.');
        return;
      }
    } catch (e) { /* archivo anterior dañado: se sobrescribe */ }
  }

  const nuevo = JSON.stringify({ p, v });
  if (fs.existsSync(ARCHIVO) && fs.readFileSync(ARCHIVO, 'utf8') === nuevo) {
    console.log('Sin cambios en el catálogo.');
    return;
  }

  fs.writeFileSync(ARCHIVO, nuevo);
  console.log(`Catálogo actualizado: ${filas(p)} productos, ${filas(v)} variantes.`);
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});