const contenedorProductos = document.getElementById('productos');
const tituloCatalogo = document.getElementById('titulo-catalogo');
const descripcionCatalogo = document.getElementById('descripcion-catalogo');
const productosDestacados = document.getElementById('productos-destacados');
const vistaInicio = document.getElementById('vista-inicio');
const vistaColeccion = document.getElementById('vista-coleccion');
const vistaProducto = document.getElementById('vista-producto');

const btnVolverColeccion = document.getElementById('btn-volver-coleccion');

const detalleImagen = document.getElementById('detalle-imagen');
const detalleColorImg = document.getElementById('detalle-color-img');
const detalleNombre = document.getElementById('detalle-nombre');
const detallePrecio = document.getElementById('detalle-precio');
const detalleDescripcion = document.getElementById('detalle-descripcion');

const qtyMinus = document.getElementById('qty-minus');
const qtyPlus = document.getElementById('qty-plus');
const qtyValue = document.getElementById('qty-value');
const vistaCarrito = document.getElementById('vista-carrito');
const btnCarrito = document.getElementById('btn-carrito');
const cartCount = document.getElementById('cart-count');
const carritoContenido = document.getElementById('carrito-contenido');
const carritoTotal = document.getElementById('carrito-total');
const btnAgregarCarrito = document.getElementById('btn-agregar-carrito');

let productoActual = null;
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

let productos = [];
let ultimaCategoria = '';
let ultimaSubcategoria = '';
let cantidadProducto = 1;

document.addEventListener('DOMContentLoaded', () => {
  configurarMenu();
  configurarDetalleProducto();
  cargarProductos();
  configurarCarrito();
actualizarContadorCarrito();
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

function configurarDetalleProducto() {
  if (btnVolverColeccion) {
    btnVolverColeccion.addEventListener('click', () => {
      vistaProducto.classList.add('oculto');
      vistaColeccion.classList.remove('oculto');
      vistaInicio.classList.add('oculto');

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  if (qtyMinus && qtyPlus && qtyValue) {
    qtyMinus.addEventListener('click', () => {
      if (cantidadProducto > 1) {
        cantidadProducto -= 1;
        qtyValue.textContent = cantidadProducto;
      }
    });

    qtyPlus.addEventListener('click', () => {
      cantidadProducto += 1;
      qtyValue.textContent = cantidadProducto;
    });
  }

  document.querySelectorAll('.size-grid button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.size-grid button').forEach(item => {
        item.classList.remove('selected');
      });

      button.classList.add('selected');
    });
  });
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

      if (contenedorProductos) {
        contenedorProductos.innerHTML = `<p>No se pudieron cargar los productos: ${error.message}</p>`;
      }
    });
}

function mostrarInicio() {
  vistaInicio.classList.remove('oculto');
  vistaColeccion.classList.add('oculto');
  vistaProducto.classList.add('oculto');
mostrarProductosAleatorios();
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
  ultimaCategoria = categoria;
  ultimaSubcategoria = subcategoria;

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

  vistaInicio.classList.add('oculto');
  vistaColeccion.classList.remove('oculto');
  vistaProducto.classList.add('oculto');

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
    const imagen = product.image_url || 'imagenes/productos/placeholder.jpg';

    const card = document.createElement('div');
    card.classList.add('producto');

    card.innerHTML = `
      <img class="producto-imagen" src="${imagen}" alt="${nombre}">
      <div class="producto-info">
        <h2>${nombre}</h2>
        <p class="producto-precio">$${precio}</p>
      </div>
    `;

    card.addEventListener('click', () => {
      mostrarDetalleProducto(product);
    });

    contenedorProductos.appendChild(card);
  });
}

function mostrarDetalleProducto(product) {
  productoActual = product;
  const nombre = product.name || product.nombre;
  const precio = product.price || product.precio;
  const imagen = product.image_url || 'imagenes/productos/placeholder.jpg';
  const descripcion = product.description || product.descripcion || 'Producto ecuestre seleccionado para comodidad, estilo y rendimiento.';

  cantidadProducto = 1;
  qtyValue.textContent = cantidadProducto;

  detalleImagen.src = imagen;
  detalleImagen.alt = nombre;

  detalleColorImg.src = imagen;
  detalleColorImg.alt = nombre;

  detalleNombre.textContent = nombre;
  detallePrecio.textContent = `$${precio}`;
  detalleDescripcion.textContent = descripcion;

  vistaInicio.classList.add('oculto');
  vistaColeccion.classList.add('oculto');
  vistaProducto.classList.remove('oculto');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function configurarCarrito() {
  if (btnCarrito) {
    btnCarrito.addEventListener('click', event => {
      event.preventDefault();
      mostrarCarrito();
    });
  }

  if (btnAgregarCarrito) {
    btnAgregarCarrito.addEventListener('click', () => {
      if (!productoActual) return;

      agregarAlCarrito(productoActual);
      mostrarCarrito();
    });
  }
}

function agregarAlCarrito(product) {
  const id = product.id;
  const nombre = product.name || product.nombre;
  const precio = Number(product.price || product.precio);
  const imagen = product.image_url || 'imagenes/productos/placeholder.jpg';

  const tallaSeleccionada = document.querySelector('.size-grid button.selected');
  const talla = tallaSeleccionada ? tallaSeleccionada.textContent.trim() : 'Sin talla';

  const itemExistente = carrito.find(item => item.id === id && item.talla === talla);

  if (itemExistente) {
    itemExistente.cantidad += cantidadProducto;
  } else {
    carrito.push({
      id,
      nombre,
      precio,
      imagen,
      talla,
      cantidad: cantidadProducto
    });
  }

  guardarCarrito();
  actualizarContadorCarrito();
}

function mostrarCarrito() {
  if (vistaInicio) vistaInicio.classList.add('oculto');
  if (vistaColeccion) vistaColeccion.classList.add('oculto');
  if (vistaProducto) vistaProducto.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.remove('oculto');

  renderizarCarrito();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function renderizarCarrito() {
  carritoContenido.innerHTML = '';

  if (carrito.length === 0) {
    carritoContenido.innerHTML = '<p>Tu carrito está vacío.</p>';
    carritoTotal.textContent = '$0.00';
    return;
  }

  let total = 0;

  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const card = document.createElement('div');
    card.classList.add('cart-item');

    card.innerHTML = `
  <img src="${item.imagen}" alt="${item.nombre}">
  <div>
    <h3>${item.nombre}</h3>
    <p>Talla: ${item.talla || 'Sin talla'}</p>
    <p>Precio: $${item.precio.toFixed(2)}</p>
    <p>Cantidad: ${item.cantidad}</p>
    <p>Subtotal: $${subtotal.toFixed(2)}</p>
  </div>
  <button class="cart-remove" data-id="${item.id}" data-talla="${item.talla || ''}">Eliminar</button>
`;

    carritoContenido.appendChild(card);
  });

  carritoTotal.textContent = `$${total.toFixed(2)}`;

  document.querySelectorAll('.cart-remove').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      carrito = carrito.filter(item => item.id !== id);
      guardarCarrito();
      actualizarContadorCarrito();
      renderizarCarrito();
    });
  });
}

function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
}

function actualizarContadorCarrito() {
  const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0);

  if (cartCount) {
    cartCount.textContent = totalItems;
  }
}
document.querySelectorAll('.cart-remove').forEach(button => {
  button.addEventListener('click', () => {
    const id = Number(button.dataset.id);
    const talla = button.dataset.talla;

    carrito = carrito.filter(item => !(item.id === id && item.talla === talla));

    guardarCarrito();
    actualizarContadorCarrito();
    renderizarCarrito();
  });
});

function mostrarProductosAleatorios() {
  if (!productosDestacados) return;

  productosDestacados.innerHTML = '';

  if (productos.length === 0) {
    productosDestacados.innerHTML = '<p>No hay productos para mostrar.</p>';
    return;
  }

  const productosMezclados = [...productos].sort(() => Math.random() - 0.5);
  const seleccionados = productosMezclados.slice(0, 3);

  seleccionados.forEach(product => {
    const nombre = product.name || product.nombre;
    const precio = product.price || product.precio;
    const imagen = product.image_url || 'imagenes/productos/placeholder.jpg';

    const card = document.createElement('div');
    card.classList.add('producto');

    card.innerHTML = `
      <img class="producto-imagen" src="${imagen}" alt="${nombre}">
      <div class="producto-info">
        <h2>${nombre}</h2>
        <p class="producto-precio">$${precio}</p>
      </div>
    `;

    card.addEventListener('click', () => {
      mostrarDetalleProducto(product);
    });

    productosDestacados.appendChild(card);
  });
}