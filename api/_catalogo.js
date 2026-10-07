/*
 * Valida lo que el cliente quiere comprar contra tu catálogo real (tu Google Sheet
 * de productos), para que el monto a cobrar lo calcule el SERVIDOR y no el navegador.
 * Así nadie puede cambiar un precio desde las herramientas del navegador y pagar de menos.
 */

const PRODUCTOS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pub?gid=0&single=true&output=csv';

const VARIANTES_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pub?gid=1834938244&single=true&output=csv';

let cache = { datos: null, hasta: 0 };

function parsearCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let enComillas = false;
  const limpio = texto.replace(/^\uFEFF/, '');

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];

    if (enComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(campo);
      campo = '';
      filas.push(fila);
      fila = [];
    } else {
      campo += c;
    }
  }

  if (campo !== '' || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }

  if (!filas.length) return [];

  const columnas = filas[0].map(nombre => nombre.trim());

  return filas
    .slice(1)
    .filter(f => f.some(valor => valor.trim() !== ''))
    .map(f => {
      const objeto = {};
      columnas.forEach((columna, i) => {
        objeto[columna] = (f[i] || '').trim();
      });
      return objeto;
    });
}

async function leerCsv(url) {
  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error('No se pudo leer el catálogo de productos.');
  }

  return parsearCsv(await respuesta.text());
}

async function cargarCatalogo() {
  if (cache.datos && Date.now() < cache.hasta) {
    return cache.datos;
  }

  const [productos, variantes] = await Promise.all([
    leerCsv(PRODUCTOS_CSV_URL),
    leerCsv(VARIANTES_CSV_URL)
  ]);

  cache = { datos: { productos, variantes }, hasta: Date.now() + 60 * 1000 };
  return cache.datos;
}

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function numero(valor) {
  return Number(String(valor || '').replace(/[^0-9.\-]/g, ''));
}

function errorCatalogo(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  error.paraCliente = true;
  return error;
}

async function validarProductos(productosCliente) {
  if (!Array.isArray(productosCliente) || productosCliente.length === 0) {
    throw errorCatalogo('Tu carrito está vacío.');
  }

  const { productos, variantes } = await cargarCatalogo();
  const verificados = [];
  let total = 0;

  for (const item of productosCliente) {
    const nombre = normalizar(item.nombre);
    const producto = productos.find(
      p => p.activo === 'SI' && normalizar(p.nombre) === nombre
    );

    if (!producto) {
      throw errorCatalogo(`El producto "${item.nombre}" ya no está disponible.`);
    }

    const susVariantes = variantes.filter(
      v => v.activo === 'SI' && v.producto_slug === producto.slug
    );

    let precio;

    if (susVariantes.length) {
      const color = normalizar(item.color);
      let variante = susVariantes.find(v => normalizar(v.color) === color);

      if (!variante && susVariantes.length === 1) {
        variante = susVariantes[0];
      }

      if (!variante) {
        throw errorCatalogo(
          `No encontramos el color elegido de "${producto.nombre}". Recarga la página e intenta de nuevo.`
        );
      }

      precio = numero(variante.precio);
    } else {
      precio = numero(producto.precio);
    }

    if (!(precio > 0)) {
      throw errorCatalogo(`El producto "${producto.nombre}" no tiene un precio válido.`);
    }

    if (Math.abs(precio - Number(item.precio)) > 0.01) {
      throw errorCatalogo(
        `El precio de "${producto.nombre}" cambió. Recarga la página e intenta de nuevo.`,
        409
      );
    }

    const cantidad = Math.min(50, Math.max(1, Math.floor(Number(item.cantidad) || 1)));

    verificados.push({
      nombre: producto.nombre,
      cantidad,
      precio,
      talla: item.talla || '',
      color: item.color || '',
      grip: item.grip || ''
    });

    total += precio * cantidad;
  }

  return { productos: verificados, total: Number(total.toFixed(2)) };
}

module.exports = { validarProductos, parsearCsv };