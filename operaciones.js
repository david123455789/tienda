const contenedorProductos = document.getElementById('productos');
const tituloCatalogo = document.getElementById('titulo-catalogo');
const descripcionCatalogo = document.getElementById('descripcion-catalogo');

let productos = [];

document.addEventListener('DOMContentLoaded', () => {
  configurarMenu();
  cargarProductos();
});

function configurarMenu() {
  const dropdown = document.querySelector('.dropdown');
  const btnMaximilian = document.getElementById('btn-maximilian');
  const btnInicio = document.getElementById('btn-inicio');

  btnMaximilian.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    dropdown.classList.toggle('open');
  });

  dropdown.addEventListener('click', event => {
    event.stopPropagation();
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });

  document.querySelectorAll('.category-btn').forEach(button => {
    button.addEventListener('click', () => {
      const category = button.closest('.menu-category');

      document.querySelectorAll('.menu-category').forEach(item => {
        if (item !== category) {
          item.classList.remove('open');
        }
      });

      category.classList.toggle('open');
    });
  });

  document.querySelectorAll('[data-categoria]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();

      const categoria = link.dataset.categoria;
      const subcategoria = link.dataset.subcategoria;

      filtrarProductos(categoria, subcategoria);
      dropdown.classList.remove('open');
    });
  });

  btnInicio.addEventListener('click', event => {
    event.preventDefault();
    tituloCatalogo.textContent = 'Productos';
    descripcionCatalogo.textContent = 'Catálogo conectado a la base de datos';
    mostrarProductos(productos);
    dropdown.classList.remove('open');
  });
}

function cargarProductos() {
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
}

function filtrarProductos(categoria, subcategoria) {
  const filtrados = productos.filter(product => {
    if (subcategoria) {
      return product.categoria === categoria && product.subcategoria === subcategoria;
    }

    return product.categoria === categoria;
  });

  tituloCatalogo.textContent = subcategoria || categoria;
  descripcionCatalogo.textContent = `Maximilian - ${categoria}${subcategoria ? ' - ' + subcategoria : ''}`;
  mostrarProductos(filtrados);
}

function mostrarProductos(lista) {
  contenedorProductos.innerHTML = '';

  if (lista.length === 0) {
    contenedorProductos.innerHTML = '<p class="mensaje-vacio">No hay productos en esta categoría.</p>';
    return;
  }

  lista.forEach(product => {
    const card = document.createElement('div');
    card.classList.add('producto');

  card.innerHTML = `
  <img class="producto-imagen" src="${product.image_url}" alt="${product.name}">
  <div class="producto-info">
    <h2>${product.name}</h2>
    <p><strong>Categoría:</strong> ${product.categoria}</p>
    <p><strong>Subcategoría:</strong> ${product.subcategoria}</p>
    <p><strong>Precio:</strong> $${product.price}</p>
    <p><strong>Stock:</strong> ${product.stock}</p>
  </div>
`;

    contenedorProductos.appendChild(card);
  });
}