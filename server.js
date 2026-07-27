const express = require('express');
const cors = require('cors');
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = 3000;

const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pub?gid=0&single=true&output=csv';

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.get('/api/products', async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SHEETS_CSV_URL);

    if (!response.ok) {
      throw new Error('No se pudo leer Google Sheets');
    }

    const csvText = await response.text();

    const rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const products = rows
      .filter(product => product.activo === 'SI')
      .map(product => ({
        id: Number(product.id),
        nombre: product.nombre,
        name: product.nombre,
        slug: product.slug,
        categoria: product.categoria,
        subcategoria: product.subcategoria,
        description: product.descripcion,
        descripcion: product.descripcion,
        precio: Number(product.precio),
        price: Number(product.precio),
        stock: Number(product.stock),
        tallas: product.tallas,
        image_url: product.imagen_url
      }));

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