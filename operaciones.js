const contenedorProductos = document.getElementById('productos');
const productosDestacados = document.getElementById('productos-destacados');

const tituloCatalogo = document.getElementById('titulo-catalogo');
const descripcionCatalogo = document.getElementById('descripcion-catalogo');
const tallas = ['XXS', 'XS', 'S', 'M', 'L', 'XL','2XS','3XS', '4XS', '5XS'];

const vistaInicio = document.getElementById('vista-inicio');
const vistaColeccion = document.getElementById('vista-coleccion');
const vistaProducto = document.getElementById('vista-producto');
const vistaCarrito = document.getElementById('vista-carrito');

const btnVolverColeccion = document.getElementById('btn-volver-coleccion');
const btnCarrito = document.getElementById('btn-carrito');
const cartCount = document.getElementById('cart-count');
const btnBuscar = document.getElementById('btn-buscar');
const busquedaPanel = document.getElementById('busqueda-panel');
const inputBusqueda = document.getElementById('input-busqueda');
const cerrarBusqueda = document.getElementById('cerrar-busqueda');
const resultadosBusqueda = document.getElementById('resultados-busqueda');
const btnToggleFiltros = document.getElementById('btn-toggle-filtros');
const filtrosPanel = document.getElementById('filtros-panel');

const detalleImagen = document.getElementById('detalle-imagen');
const detalleNombre = document.getElementById('detalle-nombre');
const detallePrecio = document.getElementById('detalle-precio');
const detalleDescripcion = document.getElementById('detalle-descripcion');

const colorOptions = document.getElementById('color-options');

const qtyMinus = document.getElementById('qty-minus');
const qtyPlus = document.getElementById('qty-plus');
const qtyValue = document.getElementById('qty-value');

const btnAgregarCarrito = document.getElementById('btn-agregar-carrito');

const carritoContenido = document.getElementById('carrito-contenido');
const carritoTotal = document.getElementById('carrito-total');

let productos = [];
let ultimaCategoria = '';
let ultimaSubcategoria = '';
let cantidadProducto = 1;
let productoActual = null;
let varianteActual = null;
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let productosColeccionActual = [];
let filtrosActivos = {
  subcategorias: [],
  precioMin: '',
  precioMax: '',
  orden: 'default'
};

document.addEventListener('DOMContentLoaded', () => {
  configurarMenu();
  configurarDetalleProducto();
  configurarCarrito();
  configurarBusqueda();
  configurarPanelFiltros();
  actualizarContadorCarrito();
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

function configurarDetalleProducto() {
  if (btnVolverColeccion) {
    btnVolverColeccion.addEventListener('click', () => {
      mostrarColeccionActual();
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

const PRODUCTOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pub?gid=0&single=true&output=csv';

const VARIANTES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QGmUxpghfQ4ksUmtL-79fJkke-pq7xBI7Pbv63H9DiJzksny0XSyOJzgJxKlxgM0ALjFD2FegOS/pub?gid=1834938244&single=true&output=csv';

async function cargarProductos() {
  try {
    const [productosRows, variantesRows] = await Promise.all([
      leerCsvDirecto(PRODUCTOS_CSV_URL),
      leerCsvDirecto(VARIANTES_CSV_URL)
    ]);

    productos = crearProductosDesdeSheets(productosRows, variantesRows);
    mostrarInicio();
  } catch (error) {
    console.error('Error cargando productos:', error);

    const mensaje = `<p>No se pudieron cargar los productos: ${error.message}</p>`;

    if (contenedorProductos) {
      contenedorProductos.innerHTML = mensaje;
    }

    if (productosDestacados) {
      productosDestacados.innerHTML = mensaje;
    }
  }
}

async function leerCsvDirecto(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('No se pudo leer Google Sheets');
  }

  const texto = await response.text();
  return parsearCsv(texto);
}

function parsearCsv(texto) {
  const filas = [];
  let fila = [];
  let celda = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const siguiente = texto[i + 1];

    if (char === '"' && entreComillas && siguiente === '"') {
      celda += '"';
      i++;
      continue;
    }

    if (char === '"') {
      entreComillas = !entreComillas;
      continue;
    }

    if (char === ',' && !entreComillas) {
      fila.push(celda.trim());
      celda = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !entreComillas) {
      if (char === '\r' && siguiente === '\n') {
        i++;
      }

      fila.push(celda.trim());

      if (fila.some(valor => valor !== '')) {
        filas.push(fila);
      }

      fila = [];
      celda = '';
      continue;
    }

    celda += char;
  }

  if (celda || fila.length > 0) {
    fila.push(celda.trim());

    if (fila.some(valor => valor !== '')) {
      filas.push(fila);
    }
  }

  const encabezados = filas.shift() || [];

  return filas.map(filaActual => {
    const objeto = {};

    encabezados.forEach((encabezado, index) => {
      objeto[encabezado.trim()] = filaActual[index] ? filaActual[index].trim() : '';
    });

    return objeto;
  });
}

function estaActivo(valor) {
  return String(valor || '').trim().toUpperCase() === 'SI';
}

function crearProductosDesdeSheets(productosRows, variantesRows) {
  const variantesActivas = variantesRows
    .filter(variante => estaActivo(variante.activo))
    .map(variante => ({
      id_variante: Number(variante.id_variante),
      producto_slug: variante.producto_slug,
      color: variante.color,
      precio: Number(variante.precio),
      price: Number(variante.precio),
      stock: Number(variante.stock),
      tallas: variante.tallas,
      image_url: variante.imagen_url
    }));

  return productosRows
    .filter(producto => estaActivo(producto.activo))
    .map(producto => {
      const variantes = variantesActivas.filter(
        variante => variante.producto_slug === producto.slug
      );

      const primeraVariante = variantes[0];

      return {
        id: Number(producto.id),
        nombre: producto.nombre,
        name: producto.nombre,
        slug: producto.slug,
        categoria: producto.categoria,
        subcategoria: producto.subcategoria,
        description: producto.descripcion,
        descripcion: producto.descripcion,
        precio: primeraVariante ? primeraVariante.precio : Number(producto.precio),
        price: primeraVariante ? primeraVariante.precio : Number(producto.precio),
        stock: primeraVariante ? primeraVariante.stock : Number(producto.stock),
        tallas: primeraVariante ? primeraVariante.tallas : producto.tallas,
        image_url: primeraVariante ? primeraVariante.image_url : producto.imagen_url,
        variantes
      };
    });
}

function mostrarInicio() {
  if (vistaInicio) vistaInicio.classList.remove('oculto');
  if (vistaColeccion) vistaColeccion.classList.add('oculto');
  if (vistaProducto) vistaProducto.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.add('oculto');

  mostrarProductosAleatorios();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function mostrarColeccionActual() {
  if (vistaInicio) vistaInicio.classList.add('oculto');
  if (vistaColeccion) vistaColeccion.classList.remove('oculto');
  if (vistaProducto) vistaProducto.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.add('oculto');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function filtrarProductos(categoria, subcategoria) {
  ultimaCategoria = categoria;
  ultimaSubcategoria = subcategoria;

  const normalizar = texto => String(texto || '').trim().toLowerCase();

  const filtrados = productos.filter(product => {
    const categoriaProducto = product.categoria || product['categorÃ­a'];
    const subcategoriaProducto = product.subcategoria || product['subcategorÃ­a'];

    if (subcategoria) {
      return (
        normalizar(categoriaProducto) === normalizar(categoria) &&
        normalizar(subcategoriaProducto) === normalizar(subcategoria)
      );
    }

    return normalizar(categoriaProducto) === normalizar(categoria);
  });

  if (tituloCatalogo) {
    tituloCatalogo.textContent = subcategoria || categoria;
  }

  if (descripcionCatalogo) {
    descripcionCatalogo.textContent = `Maximilian - ${categoria}${subcategoria ? ' - ' + subcategoria : ''}`;
  }

  mostrarColeccionActual();
 productosColeccionActual = filtrados;
resetearFiltros();
renderizarFiltros(productosColeccionActual);
mostrarProductos(productosColeccionActual);
}

function mostrarProductos(lista) {
  if (!contenedorProductos) return;

  contenedorProductos.innerHTML = '';

  if (!lista || lista.length === 0) {
    contenedorProductos.innerHTML = '<p class="mensaje-vacio">No hay productos en esta categorÃ­a.</p>';
    return;
  }

  lista.forEach(product => {
    const card = crearCardProducto(product);
    contenedorProductos.appendChild(card);
  });
}

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
    const card = crearCardProducto(product);
    productosDestacados.appendChild(card);
  });
}

function crearCardProducto(product) {
  const nombre = product.name || product.nombre;
  const precio = product.price || product.precio;
  const imagen = product.image_url || 'imagenes/productos/placeholder.jpg';
  const variantes = product.variantes || [];

  const card = document.createElement('div');
  card.classList.add('producto');

  const variantesHtml = variantes.length > 0
    ? `
      <div class="producto-variantes">
        ${variantes.map(variant => `
          <button
            class="variante-mini"
            type="button"
            title="${variant.color}"
            data-imagen="${variant.image_url}"
          >
            <img src="${variant.image_url}" alt="${variant.color}">
          </button>
        `).join('')}
      </div>
    `
    : '';

  card.innerHTML = `
    <img class="producto-imagen" src="${imagen}" alt="${nombre}">
    ${variantesHtml}
    <div class="producto-info">
      <h2>${nombre}</h2>
      <p class="producto-precio">$${precio}</p>
    </div>
  `;

  const imagenProducto = card.querySelector('.producto-imagen');

  card.querySelectorAll('.variante-mini').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();

      const nuevaImagen = button.dataset.imagen;
      imagenProducto.src = nuevaImagen;

      card.querySelectorAll('.variante-mini').forEach(item => {
        item.classList.remove('selected');
      });

      button.classList.add('selected');
    });
  });

  card.addEventListener('click', () => {
    mostrarDetalleProducto(product);
  });

  return card;
}

function mostrarDetalleProducto(product) {
  productoActual = product;
  cantidadProducto = 1;

  if (qtyValue) {
    qtyValue.textContent = cantidadProducto;
  }

  const nombre = product.name || product.nombre;
  const precio = product.price || product.precio;
  const imagen = product.image_url || 'imagenes/productos/placeholder.jpg';
  const descripcion = product.description || product.descripcion || 'Producto ecuestre seleccionado para comodidad, estilo y rendimiento.';

  if (detalleImagen) {
    detalleImagen.src = imagen;
    detalleImagen.alt = nombre;
  }

  if (detalleNombre) {
    detalleNombre.textContent = nombre;
  }

  if (detallePrecio) {
    detallePrecio.textContent = `$${precio}`;
  }

  if (detalleDescripcion) {
    detalleDescripcion.textContent = descripcion;
  }

  renderizarVariantes(product);

  if (vistaInicio) vistaInicio.classList.add('oculto');
  if (vistaColeccion) vistaColeccion.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.add('oculto');
  if (vistaProducto) vistaProducto.classList.remove('oculto');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function renderizarVariantes(product) {
  if (!colorOptions) return;

  colorOptions.innerHTML = '';

  const variantes = product.variantes || [];

  if (variantes.length === 0) {
    varianteActual = null;

    const nombre = product.name || product.nombre;
    const imagen = product.image_url || 'imagenes/productos/placeholder.jpg';

    colorOptions.innerHTML = `
      <button class="color-card selected" type="button">
        <img src="${imagen}" alt="${nombre}">
        <span>Ãšnico</span>
      </button>
    `;

    renderizarTallas(product.tallas);
    return;
  }

  varianteActual = variantes[0];
  aplicarVariante(varianteActual);

  variantes.forEach((variant, index) => {
    const button = document.createElement('button');
    button.classList.add('color-card');

    if (index === 0) {
      button.classList.add('selected');
    }

    button.type = 'button';

    button.innerHTML = `
      <img src="${variant.image_url}" alt="${variant.color}">
      <span>${variant.color}</span>
      <small>$${variant.precio}</small>
    `;

    button.addEventListener('click', () => {
      document.querySelectorAll('.color-card').forEach(item => {
        item.classList.remove('selected');
      });

      button.classList.add('selected');
      varianteActual = variant;
      aplicarVariante(variant);
    });

    colorOptions.appendChild(button);
  });
}

function aplicarVariante(variant) {
  if (detalleImagen) {
    detalleImagen.src = variant.image_url;
    detalleImagen.alt = variant.color;
  }

  if (detallePrecio) {
    detallePrecio.textContent = `$${variant.precio}`;
  }

  renderizarTallas(variant.tallas);
}

function renderizarTallas(tallasTexto) {
  const sizeGrid = document.querySelector('.size-grid');

  if (!sizeGrid) return;

  const tallas = tallasTexto
    ? tallasTexto.split(',').map(talla => talla.trim()).filter(Boolean)
    : [];

  sizeGrid.innerHTML = '';

  if (tallas.length === 0) {
    sizeGrid.innerHTML = '<p class="mensaje-vacio">Sin tallas disponibles.</p>';
    return;
  }

  tallas.forEach((talla, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = talla;

    if (index === 0) {
      button.classList.add('selected');
    }

    button.addEventListener('click', () => {
      document.querySelectorAll('.size-grid button').forEach(item => {
        item.classList.remove('selected');
      });

      button.classList.add('selected');
    });

    sizeGrid.appendChild(button);
  });
}

function agregarAlCarrito(product) {
  const id = product.id;
  const nombre = product.name || product.nombre;

  const tallaSeleccionada = document.querySelector('.size-grid button.selected');
  const talla = tallaSeleccionada ? tallaSeleccionada.textContent.trim() : 'Sin talla';

  const color = varianteActual ? varianteActual.color : 'Ãšnico';
  const precio = varianteActual ? Number(varianteActual.precio) : Number(product.price || product.precio);
  const imagen = varianteActual ? varianteActual.image_url : product.image_url;
  const idVariante = varianteActual ? varianteActual.id_variante : null;

  const itemExistente = carrito.find(item =>
    item.id === id &&
    item.idVariante === idVariante &&
    item.talla === talla
  );

  if (itemExistente) {
    itemExistente.cantidad += cantidadProducto;
  } else {
    carrito.push({
      id,
      idVariante,
      nombre,
      color,
      talla,
      precio,
      imagen,
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
  if (!carritoContenido || !carritoTotal) return;

  carritoContenido.innerHTML = '';

  if (carrito.length === 0) {
    carritoContenido.innerHTML = '<p>Tu carrito estÃ¡ vacÃ­o.</p>';
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
        <p>Color: ${item.color || 'Ãšnico'}</p>
        <p>Talla: ${item.talla || 'Sin talla'}</p>
        <p>Precio: $${item.precio.toFixed(2)}</p>
        <p>Cantidad: ${item.cantidad}</p>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
      </div>
      <button class="cart-remove" data-id="${item.id}" data-variante="${item.idVariante || ''}" data-talla="${item.talla || ''}">Eliminar</button>
    `;

    carritoContenido.appendChild(card);
  });

  carritoTotal.textContent = `$${total.toFixed(2)}`;

  document.querySelectorAll('.cart-remove').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      const idVariante = button.dataset.variante ? Number(button.dataset.variante) : null;
      const talla = button.dataset.talla;

      carrito = carrito.filter(item =>
        !(item.id === id && item.idVariante === idVariante && item.talla === talla)
      );

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

function obtenerLista(valor) {
  if (!valor) return [];

  return String(valor)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function renderizarTallas(tallasTexto) {
  const sizeGrid = document.querySelector('.size-grid');
  if (!sizeGrid) return;

  const tallas = obtenerLista(tallasTexto);

  sizeGrid.innerHTML = '';

  if (tallas.length === 0) {
    sizeGrid.innerHTML = '<p class="mensaje-vacio">Sin tallas disponibles.</p>';
    tallaSeleccionada = '';
    return;
  }

  tallaSeleccionada = tallas[0];

  tallas.forEach((talla, index) => {
    const boton = document.createElement('button');
    boton.textContent = talla;

    if (index === 0) {
      boton.classList.add('selected');
    }

    boton.addEventListener('click', () => {
      tallaSeleccionada = talla;

      document.querySelectorAll('.size-grid button').forEach(btn => {
        btn.classList.remove('selected');
      });

      boton.classList.add('selected');
    });

    sizeGrid.appendChild(boton);
  });
}

function obtenerPrecio(producto) {
  return Number(producto.precio || producto.price || 0);
}

function obtenerCategoria(producto) {
  return producto.categoria || producto['categorÃ­a'] || '';
}

function obtenerSubcategoria(producto) {
  return producto.subcategoria || producto['subcategorÃ­a'] || '';
}

function resetearFiltros() {
  filtrosActivos = {
    subcategorias: [],
    precioMin: '',
    precioMax: '',
    orden: 'default'
  };
}

function configurarPanelFiltros() {
  if (!btnToggleFiltros || !filtrosPanel) return;

  btnToggleFiltros.addEventListener('click', () => {
    const abierto = !filtrosPanel.classList.contains('open');
    if (abierto) {
      abrirFiltros();
    } else {
      cerrarFiltros();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') cerrarFiltros();
  });

  document.addEventListener('click', (event) => {
    if (!filtrosPanel.classList.contains('open')) return;
    if (filtrosPanel.contains(event.target) || btnToggleFiltros.contains(event.target)) return;
    cerrarFiltros();
  });
}

function abrirFiltros() {
  if (!btnToggleFiltros || !filtrosPanel) return;
  filtrosPanel.classList.add('open');
  btnToggleFiltros.classList.add('is-open');
  btnToggleFiltros.setAttribute('aria-expanded', 'true');
}

function cerrarFiltros() {
  if (!btnToggleFiltros || !filtrosPanel) return;
  filtrosPanel.classList.remove('open');
  btnToggleFiltros.classList.remove('is-open');
  btnToggleFiltros.setAttribute('aria-expanded', 'false');
}
function renderizarFiltros(lista) {
  const panel = document.getElementById('filtros-panel');
  if (!panel) return;

  const subcategorias = [...new Set(
    lista
      .map(producto => obtenerSubcategoria(producto))
      .filter(Boolean)
  )];

  panel.innerHTML = `
    <div class="filtros-head">
      <h3>Filtrar</h3>
      <button class="cerrar-filtros" type="button" aria-label="Cerrar filtros">×</button>
    </div>

    <div class="filtro-grupo">
      <h4>Subcategoría</h4>
      ${subcategorias.map(subcategoria => `
        <label class="filtro-opcion">
          <input type="checkbox" value="${subcategoria}" class="filtro-subcategoria">
          <span>${subcategoria}</span>
        </label>
      `).join('')}
    </div>

    <div class="filtro-grupo">
      <h4>Precio</h4>
      <div class="precio-inputs">
        <input type="number" id="precio-min" placeholder="Min">
        <input type="number" id="precio-max" placeholder="Máx">
      </div>
    </div>

    <div class="filtro-grupo">
      <h4>Ordenar</h4>
      <select id="orden-productos" class="filtro-select">
        <option value="default">Recomendados</option>
        <option value="precio-menor">Precio menor</option>
        <option value="precio-mayor">Precio mayor</option>
        <option value="nombre">Nombre A-Z</option>
      </select>
    </div>

    <button class="btn-limpiar-filtros" id="limpiar-filtros">
      Limpiar filtros
    </button>
  `;

  panel.querySelectorAll('.filtro-subcategoria').forEach(input => {
    input.addEventListener('change', actualizarVistaConFiltros);
  });

  panel.querySelector('#precio-min').addEventListener('input', actualizarVistaConFiltros);
  panel.querySelector('#precio-max').addEventListener('input', actualizarVistaConFiltros);
  panel.querySelector('#orden-productos').addEventListener('change', actualizarVistaConFiltros);

  panel.querySelector('#limpiar-filtros').addEventListener('click', () => {
    resetearFiltros();
    renderizarFiltros(productosColeccionActual);
    mostrarProductos(productosColeccionActual);
  });
}

function aplicarFiltrosColeccion() {
  const panel = document.getElementById('filtros-panel');

  if (panel) {
    filtrosActivos.subcategorias = [...panel.querySelectorAll('.filtro-subcategoria:checked')]
      .map(input => input.value);

    filtrosActivos.precioMin = panel.querySelector('#precio-min')?.value || '';
    filtrosActivos.precioMax = panel.querySelector('#precio-max')?.value || '';
    filtrosActivos.orden = panel.querySelector('#orden-productos')?.value || 'default';
  }

  let resultado = [...productosColeccionActual];

  if (filtrosActivos.subcategorias.length > 0) {
    resultado = resultado.filter(producto =>
      filtrosActivos.subcategorias.includes(obtenerSubcategoria(producto))
    );
  }

  if (filtrosActivos.precioMin !== '') {
    resultado = resultado.filter(producto =>
      obtenerPrecio(producto) >= Number(filtrosActivos.precioMin)
    );
  }

  if (filtrosActivos.precioMax !== '') {
    resultado = resultado.filter(producto =>
      obtenerPrecio(producto) <= Number(filtrosActivos.precioMax)
    );
  }

  if (filtrosActivos.orden === 'precio-menor') {
    resultado.sort((a, b) => obtenerPrecio(a) - obtenerPrecio(b));
  }

  if (filtrosActivos.orden === 'precio-mayor') {
    resultado.sort((a, b) => obtenerPrecio(b) - obtenerPrecio(a));
  }

  if (filtrosActivos.orden === 'nombre') {
    resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  return resultado;
}

function actualizarVistaConFiltros() {
  mostrarProductos(aplicarFiltrosColeccion());
}
function configurarBusqueda() {
  if (!btnBuscar || !busquedaPanel || !inputBusqueda || !resultadosBusqueda) return;

  btnBuscar.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    abrirBusqueda();
  });

  cerrarBusqueda?.addEventListener('click', cerrarPanelBusqueda);

  inputBusqueda.addEventListener('input', () => {
    renderizarResultadosBusqueda(inputBusqueda.value);
  });

  inputBusqueda.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const resultados = obtenerResultadosBusqueda(inputBusqueda.value);
    if (!resultados.length) return;

    mostrarBusquedaComoColeccion(resultados, inputBusqueda.value);
    cerrarPanelBusqueda();
  });

  busquedaPanel.addEventListener('click', event => {
    if (event.target === busquedaPanel) cerrarPanelBusqueda();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cerrarPanelBusqueda();
  });
}

function abrirBusqueda() {
  if (!busquedaPanel || !inputBusqueda) return;
  busquedaPanel.classList.remove('oculto');
  busquedaPanel.setAttribute('aria-hidden', 'false');
  inputBusqueda.focus();
  renderizarResultadosBusqueda(inputBusqueda.value);
}

function cerrarPanelBusqueda() {
  if (!busquedaPanel) return;
  busquedaPanel.classList.add('oculto');
  busquedaPanel.setAttribute('aria-hidden', 'true');
}

function normalizarBusqueda(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function obtenerResultadosBusqueda(termino) {
  const texto = normalizarBusqueda(termino);
  if (!texto) return productos.slice(0, 6);

  return productos.filter(producto => {
    const contenido = [
      producto.nombre,
      producto.name,
      producto.categoria,
      producto.subcategoria,
      producto.descripcion,
      producto.description,
      producto.slug
    ].map(normalizarBusqueda).join(' ');

    return contenido.includes(texto);
  });
}

function escaparBusquedaHtml(valor) {
  return String(valor || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderizarResultadosBusqueda(termino) {
  if (!resultadosBusqueda) return;

  const resultados = obtenerResultadosBusqueda(termino).slice(0, 8);

  if (!resultados.length) {
    resultadosBusqueda.innerHTML = '<p class="search-empty">No encontramos productos.</p>';
    return;
  }

  resultadosBusqueda.innerHTML = resultados.map((producto, index) => `
    <button class="search-result" type="button" data-search-index="${index}">
      <img src="${escaparBusquedaHtml(producto.image_url || producto.imagen_url || producto.imagen || '')}" alt="${escaparBusquedaHtml(producto.nombre || producto.name || 'Producto')}">
      <span>
        <strong>${escaparBusquedaHtml(producto.nombre || producto.name || 'Producto')}</strong>
        <small>${escaparBusquedaHtml(producto.categoria || '')}${producto.subcategoria ? ' - ' + escaparBusquedaHtml(producto.subcategoria) : ''}</small>
      </span>
    </button>
  `).join('');

  resultadosBusqueda.querySelectorAll('.search-result').forEach(boton => {
    boton.addEventListener('click', () => {
      const producto = resultados[Number(boton.dataset.searchIndex)];
      if (!producto) return;
      mostrarDetalleProducto(producto);
      cerrarPanelBusqueda();
    });
  });
}

function mostrarBusquedaComoColeccion(resultados, termino) {
  productosColeccionActual = resultados;
  ultimaCategoria = 'Busqueda';
  ultimaSubcategoria = termino;

  vistaInicio?.classList.add('oculto');
  vistaProducto?.classList.add('oculto');
  vistaCarrito?.classList.add('oculto');
  vistaColeccion?.classList.remove('oculto');

  if (tituloCatalogo) tituloCatalogo.textContent = `Busqueda: ${termino}`;
  if (descripcionCatalogo) descripcionCatalogo.textContent = `${resultados.length} producto(s) encontrado(s)`;

  resetearFiltros();
  renderizarFiltros(productosColeccionActual);
  mostrarProductos(productosColeccionActual);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
