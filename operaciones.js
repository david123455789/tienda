const contenedorProductos = document.getElementById('productos');
const tituloCatalogo = document.getElementById('titulo-catalogo');
const descripcionCatalogo = document.getElementById('descripcion-catalogo');
const vistaInicio = document.getElementById('vista-inicio');
const vistaColeccion = document.getElementById('vista-coleccion');

let productos = [];

document.addEventListener('DOMContentLoaded', () => {
  configurarMenu();
  cargarProductos();
});

function configurarMenu() {
  const dropdown = document.querySelector('.dropdown');
  const btnMaximilian = document.getElementById('btn-maximilian');
  const btnInicio = document.getElementById('btn-inicio');

  if (btnMaximilian && dropdown) {
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
  }

  document.querySelectorAll('.category-btn').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

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

      if (dropdown) {
        dropdown.classList.remove('open');
      }
    });
  });

  document.querySelectorAll('[data-categoria-home]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();

      const categoria = button.dataset.categoriaHome;
      filtrarProductos(categoria, '');
    });
  });

  if (btnInicio) {
    btnInicio.addEventListener('click', event => {
      event.preventDefault();

      mostrarInicio();

      if (dropdown) {
        dropdown.classList.remove('open');
      }
    });
  }
}

function cargarProductos() {
  fetch('http://localhost:3000/api/products')
    .then(response => response.json())
    .then(data => {
      productos = data;
      mostrarInicio();
    })
    .catch(error => {
      console.error('Error cargando productos:', error);
      contenedorProductos.innerHTML = `<p>No se pudieron cargar los productos: ${error.message}</p>`;
    });
}

function mostrarInicio() {
  if (vistaInicio) {
    vistaInicio.style.display = 'block';
  }

  if (vistaColeccion) {
    vistaColeccion.style.display = 'none';
  }

  if (tituloCatalogo) {
    tituloCatalogo.textContent = 'Productos';
  }

  if (descripcionCatalogo) {
    descripcionCatalogo.textContent = 'Catálogo conectado a la base de datos';
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function filtrarProductos(categoria, subcategoria) {
  const filtrados = productos.filter(product => {
    const categoriaProducto = product.categoria || product['categoría'];
    const subcategoriaProducto = product.subcategoria || product['subcategoría'];

    if (subcategoria) {
      return categoriaProducto === categoria && subcategoriaProducto === subcategoria;
    }

    return categoriaProducto === categoria;
  });

  if (tituloCatalogo) {
    tituloCatalogo.textContent = subcategoria || categoria;
  }

  if (descripcionCatalogo) {
    descripcionCatalogo.textContent = `Maximilian - ${categoria}${subcategoria ? ' - ' + subcategoria : ''}`;
  }

  if (vistaInicio) {
    vistaInicio.style.display = 'none';
  }

  if (vistaColeccion) {
    vistaColeccion.style.display = 'block';
  }

  mostrarProductos(filtrados);

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function mostrarProductos(lista) {
  contenedorProductos.innerHTML = '';

  if (lista.length === 0) {
    contenedorProductos.innerHTML = '<p class="mensaje-vacio">No hay productos en esta categoría.</p>';
    return;
  }

  lista.forEach(product => {
    const nombre = product.name || product.nombre;
    const precio = product.price || product.precio;
    const categoria = product.categoria || product['categoría'];
    const subcategoria = product.subcategoria || product['subcategoría'];
    const imagen = product.image_url || 'imagenes/productos/placeholder.jpg';

    const card = document.createElement('div');
    card.classList.add('producto');

    card.innerHTML = `
      <img class="producto-imagen" src="${imagen}" alt="${nombre}">
      <div class="producto-info">
        <h2>${nombre}</h2>
        <p><strong>Categoría:</strong> ${categoria}</p>
        <p><strong>Subcategoría:</strong> ${subcategoria}</p>
        <p><strong>Precio:</strong> $${precio}</p>
        <p><strong>Stock:</strong> ${product.stock}</p>
      </div>
    `;

    contenedorProductos.appendChild(card);
  });
}