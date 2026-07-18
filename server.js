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
  const result = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.price,
      p.stock,
      c.name AS subcategoria,
      parent.name AS categoria
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN categories parent ON c.parent_id = parent.id
    ORDER BY parent.name, c.name, p.name;
  `);

  res.json(result.rows);
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});