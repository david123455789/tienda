fetch('http://localhost:3000/api/products')
  .then(response => response.json())
  .then(products => {
    console.log(products);
  })
  .catch(error => {
    console.error('Error cargando productos:', error);
  });

  const contenedorProductos = document.getElementById('productos');

fetch('http://localhost:3000/api/products')
  .then(response => response.json())
  .then(products => {
    contenedorProductos.innerHTML = '';

    products.forEach(product => {
      const card = document.createElement('div');
      card.classList.add('producto');

      card.innerHTML = `
        <h2>${product.name}</h2>
        <p><strong>Categoria:</strong> ${product.categoria}</p>
        <p><strong>Subcategoria:</strong> ${product.subcategoria}</p>
        <p><strong>Precio:</strong> $${product.price}</p>
        <p><strong>Stock:</strong> ${product.stock}</p>
      `;

      contenedorProductos.appendChild(card);
    });
  })
  .catch(error => {
    console.error('Error cargando productos:', error);
    contenedorProductos.innerHTML = '<p>No se pudieron cargar los productos.</p>';
  });

  document.querySelectorAll('[data-categoria]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();

    const categoria = link.dataset.categoria;
    const subcategoria = link.dataset.subcategoria;

    mostrarProductos(categoria, subcategoria);
  });
});

const contenedorProductos = document.getElementById('productos');
let productos = [];

fetch('http://localhost:3000/api/products')
  .then(response => response.json())
  .then(data => {
    productos = data;
    mostrarProductos(productos);
  })
  .catch(error => {
    console.error('Error cargando productos:', error);
    contenedorProductos.innerHTML = '<p>No se pudieron cargar los productos.</p>';
  });

function mostrarProductos(lista) {
  contenedorProductos.innerHTML = '';

  if (lista.length === 0) {
    contenedorProductos.innerHTML = '<p>No hay productos en esta categoría.</p>';
    return;
  }

  lista.forEach(product => {
    const card = document.createElement('div');
    card.classList.add('producto');

    card.innerHTML = `
      <h2>${product.name}</h2>
      <p><strong>Categoría:</strong> ${product.categoria}</p>
      <p><strong>Subcategoría:</strong> ${product.subcategoria}</p>
      <p><strong>Precio:</strong> $${product.price}</p>
      <p><strong>Stock:</strong> ${product.stock}</p>
    `;

    contenedorProductos.appendChild(card);
  });
}

document.querySelectorAll('[data-categoria]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();

    const categoria = link.dataset.categoria;
    const subcategoria = link.dataset.subcategoria;

    const filtrados = productos.filter(product => {
      return product.categoria === categoria && product.subcategoria === subcategoria;
    });

    mostrarProductos(filtrados);
  });
});