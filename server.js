const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'tienda',
  user: 'postgres',
  password: '12345'
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.stock,
        sub.name AS subcategoria,
        main.name AS categoria,
        img.image_url
      FROM products p
      LEFT JOIN categories sub ON p.category_id = sub.id
      LEFT JOIN categories main ON sub.parent_id = main.id
      LEFT JOIN product_images img ON img.product_id = p.id
      ORDER BY main.name, sub.name, p.name;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('ERROR COMPLETO:', error);

    res.status(500).json({
      error: 'Error consultando productos',
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  }
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});