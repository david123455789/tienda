

const express = require('express');
const cors = require('cors');
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = 3000;

const PRODUCTOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pub?gid=0&single=true&output=csv';
const VARIANTES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pubhtml?gid=1834938244&single=true';

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

async function leerCsv(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('No se pudo leer Google Sheets');
  }

  const csvText = await response.text();

  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

app.get('/api/products', async (req, res) => {
  try {
    const productosRows = await leerCsv(PRODUCTOS_CSV_URL);
    const variantesRows = await leerCsv(VARIANTES_CSV_URL);

    const variantesActivas = variantesRows
      .filter(variant => variant.activo === 'SI')
      .map(variant => ({
        id_variante: Number(variant.id_variante),
        producto_slug: variant.producto_slug,
        color: variant.color,
        precio: Number(variant.precio),
        price: Number(variant.precio),
        stock: Number(variant.stock),
        tallas: variant.tallas,
        image_url: variant.imagen_url
      }));

    const products = productosRows
      .filter(product => product.activo === 'SI')
      .map(product => {
        const variantes = variantesActivas.filter(
          variant => variant.producto_slug === product.slug
        );

        const primeraVariante = variantes[0];

        return {
          id: Number(product.id),
          nombre: product.nombre,
          name: product.nombre,
          slug: product.slug,
          categoria: product.categoria,
          subcategoria: product.subcategoria,
          description: product.descripcion,
          descripcion: product.descripcion,
          precio: primeraVariante ? primeraVariante.precio : Number(product.precio),
          price: primeraVariante ? primeraVariante.precio : Number(product.precio),
          stock: primeraVariante ? primeraVariante.stock : Number(product.stock),
          tallas: primeraVariante ? primeraVariante.tallas : product.tallas,
          image_url: primeraVariante ? primeraVariante.image_url : product.imagen_url,
          variantes
        };
      });

    res.json(products);
  } catch (error) {
    console.error('Error consultando productos:', error);
    res.status(500).json({
      error: 'Error consultando productos',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});