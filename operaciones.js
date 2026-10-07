const contenedorProductos = document.getElementById('productos');
const productosDestacados = document.getElementById('productos-destacados');

const tituloCatalogo = document.getElementById('titulo-catalogo');
const descripcionCatalogo = document.getElementById('descripcion-catalogo');
const tallas = ['XXS', 'XS', 'S', 'M', 'L', 'XL','2XS','3XS', '4XS', '5XS'];

const vistaInicio = document.getElementById('vista-inicio');
const vistaColeccion = document.getElementById('vista-coleccion');
const vistaProducto = document.getElementById('vista-producto');
const vistaCarrito = document.getElementById('vista-carrito');
const vistaCuenta = document.getElementById('vista-cuenta');
const vistaCheckout = document.getElementById('vista-checkout');
const btnComprarAhora = document.getElementById('btn-comprar-ahora');
const btnFinalizarCompra = document.getElementById('btn-finalizar-compra');
const btnPagarMercadoPago = document.getElementById('btn-pagar-mercadopago');
const btnPagarPaypal = document.getElementById('btn-pagar-paypal');
const btnPagarClip = document.getElementById('btn-pagar-clip');

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
const detalleGaleriaLista = document.getElementById('detalle-galeria-lista');
const detalleNombre = document.getElementById('detalle-nombre');
const detallePrecio = document.getElementById('detalle-precio');
const detalleDescripcion = document.getElementById('detalle-descripcion');
const detalleCaracteristicas = document.getElementById('detalle-caracteristicas');

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
let carrito = [];

/* CARRITO POR CUENTA: cada usuario tiene su propio carrito */

function claveCarritoUsuario() {
  const usuario = window.usuarioActual;
  return usuario ? `carrito_${usuario.uid}` : null;
}

function cargarCarritoUsuario() {
  const clave = claveCarritoUsuario();

  if (clave) {
    try {
      carrito = JSON.parse(localStorage.getItem(clave)) || [];
    } catch (error) {
      carrito = [];
    }
  } else {
    carrito = [];
  }

  actualizarContadorCarrito();

  if (vistaCarrito && !vistaCarrito.classList.contains('oculto')) {
    if (clave) {
      renderizarCarrito();
    } else {
      mostrarInicio();
    }
  }
}

function pedirInicioSesion(mensaje) {
  document.dispatchEvent(new CustomEvent('pedir-login', { detail: { mensaje } }));
}

// El carrito antiguo (compartido por todos) ya no se usa
localStorage.removeItem('carrito');

// Cada vez que alguien inicia o cierra sesión, se carga SU carrito
document.addEventListener('usuario-actualizado', cargarCarritoUsuario);
let itemsCheckout = [];
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
  configurarCuenta();
  configurarCheckout();
  configurarFormularioTarjeta();
  configurarPagoTarjetaGuardada();
  configurarPagoClip();
  cargarCarritoUsuario();
  cargarProductos();
  confirmarPedidoSiAplica();
  confirmarLinkClipSiAplica();
});

function configurarMenu() {
  const dropdown = document.querySelector('.dropdown');
  const btnMaximilian = document.getElementById('btn-maximilian');
  const btnInicio = document.getElementById('btn-inicio');
  const logoInicio = document.getElementById('logo-inicio');

  if (logoInicio) {
    logoInicio.addEventListener('click', event => {
      event.preventDefault();
      mostrarInicio();

      if (dropdown) {
        dropdown.classList.remove('open');
      }
    });
  }

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

      if (!window.usuarioActual) {
        pedirInicioSesion('Inicia sesión para ver tu carrito.');
        return;
      }

      mostrarCarrito();
    });
  }

  if (btnAgregarCarrito) {
    btnAgregarCarrito.addEventListener('click', () => {
      if (!productoActual) return;

      if (!window.usuarioActual) {
        pedirInicioSesion('Inicia sesión para agregar productos a tu carrito.');
        return;
      }

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
        caracteristicas: (producto.Caracteristicas || producto.caracteristicas || '')
          .split('\n')
          .map(linea => linea.trim())
          .filter(Boolean),
        precio: primeraVariante ? primeraVariante.precio : Number(producto.precio),
        price: primeraVariante ? primeraVariante.precio : Number(producto.precio),
        stock: primeraVariante ? primeraVariante.stock : Number(producto.stock),
        tallas: primeraVariante ? primeraVariante.tallas : producto.tallas,
        grip: producto.Grip || producto.grip || '',
        image_url: primeraVariante ? primeraVariante.image_url : producto.imagen_url,
        galeria: (producto.fotos_extra || '')
          .split(',')
          .map(url => url.trim())
          .filter(Boolean),
        variantes
      };
    });
}

function mostrarInicio() {
  if (vistaInicio) vistaInicio.classList.remove('oculto');
  if (vistaColeccion) vistaColeccion.classList.add('oculto');
  if (vistaProducto) vistaProducto.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.add('oculto');
  if (vistaCuenta) vistaCuenta.classList.add('oculto');
  if (vistaCheckout) vistaCheckout.classList.add('oculto');

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
  if (vistaCuenta) vistaCuenta.classList.add('oculto');
  if (vistaCheckout) vistaCheckout.classList.add('oculto');

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

  if (detalleCaracteristicas) {
    const caracteristicas = product.caracteristicas || [];

    detalleCaracteristicas.innerHTML = caracteristicas
      .map(punto => `<li>${punto}</li>`)
      .join('');

    detalleCaracteristicas.classList.toggle('oculto', caracteristicas.length === 0);
  }

  renderizarGaleriaExtra(product);

  renderizarVariantes(product);

  renderizarGrip(product.grip);

  if (vistaInicio) vistaInicio.classList.add('oculto');
  if (vistaColeccion) vistaColeccion.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.add('oculto');
  if (vistaCuenta) vistaCuenta.classList.add('oculto');
  if (vistaCheckout) vistaCheckout.classList.add('oculto');
  if (vistaProducto) vistaProducto.classList.remove('oculto');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function renderizarGaleriaExtra(product) {
  if (!detalleGaleriaLista) return;

  detalleGaleriaLista.querySelectorAll('.galeria-extra').forEach(img => img.remove());

  const nombre = product.name || product.nombre;
  const galeria = product.galeria || [];

  galeria.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = nombre;
    img.classList.add('galeria-extra');
    detalleGaleriaLista.appendChild(img);
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

  varianteActual = variantes.find(variant => Number(variant.stock) > 0) || variantes[0];
  aplicarVariante(varianteActual);

  variantes.forEach((variant, index) => {
    const agotado = Number(variant.stock) <= 0;

    const button = document.createElement('button');
    button.classList.add('color-card');

    if (agotado) {
      button.classList.add('sold-out');
    }

    if (variant === varianteActual) {
      button.classList.add('selected');
    }

    button.type = 'button';

    button.innerHTML = `
      <div class="color-image-wrap">
        <img src="${variant.image_url}" alt="${variant.color}">
        ${agotado ? '<span class="sold-out-badge">Agotado</span>' : ''}
      </div>
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

  const sinStock = Number(variant.stock) <= 0;

  if (btnAgregarCarrito) {
    btnAgregarCarrito.disabled = sinStock;
    btnAgregarCarrito.textContent = sinStock ? 'Agotado' : 'Agregar al carrito';
  }

  if (btnComprarAhora) {
    btnComprarAhora.disabled = sinStock;
    btnComprarAhora.textContent = sinStock ? 'Agotado' : 'Comprar';
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
  const grip = document.querySelector('.grip-grid button.selected');
  const gripTexto = grip ? grip.textContent.trim() : '';

  const color = varianteActual ? varianteActual.color : 'Único';
  const precio = varianteActual ? Number(varianteActual.precio) : Number(product.price || product.precio);
  const imagen = varianteActual ? varianteActual.image_url : product.image_url;
  const idVariante = varianteActual ? varianteActual.id_variante : null;

  const itemExistente = carrito.find(item =>
    item.id === id &&
    item.idVariante === idVariante &&
    item.talla === talla &&
    item.grip === gripTexto
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
      grip: gripTexto,
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
  if (vistaCuenta) vistaCuenta.classList.add('oculto');
  if (vistaCheckout) vistaCheckout.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.remove('oculto');

  renderizarCarrito();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

/* CHECKOUT */

function mostrarCheckout(items) {
  itemsCheckout = items;

  if (vistaInicio) vistaInicio.classList.add('oculto');
  if (vistaColeccion) vistaColeccion.classList.add('oculto');
  if (vistaProducto) vistaProducto.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.add('oculto');
  if (vistaCuenta) vistaCuenta.classList.add('oculto');
  if (vistaCheckout) vistaCheckout.classList.remove('oculto');

  renderizarResumenCheckout();
  cargarDireccionesGuardadasCheckout();

  const mensaje = document.getElementById('checkout-mensaje');
  if (mensaje) mensaje.textContent = '';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function renderizarResumenCheckout() {
  const lista = document.getElementById('checkout-resumen-lista');
  const totalEl = document.getElementById('checkout-total');
  if (!lista || !totalEl) return;

  let total = 0;

  lista.innerHTML = itemsCheckout.map(item => {
    const subtotal = Number(item.precio) * Number(item.cantidad);
    total += subtotal;

    return `
      <div class="checkout-item">
        <span>${item.nombre}${item.talla ? ' - Talla ' + item.talla : ''}${item.grip ? ' - ' + item.grip : ''}${item.color ? ' - ' + item.color : ''} × ${item.cantidad}</span>
        <strong>$${subtotal.toFixed(2)}</strong>
      </div>
    `;
  }).join('');

  totalEl.textContent = `$${total.toFixed(2)}`;
  actualizarBotonClip();
}

function configurarCheckout() {
  const inputCp = document.getElementById('checkout-cp');

  if (inputCp) {
    inputCp.addEventListener('input', () => {
      inputCp.value = inputCp.value.replace(/\D/g, '').slice(0, 5);

      if (inputCp.value.length === 5) {
        buscarDatosPorCPCheckout();
      }
    });
  }

  const selectorDirecciones = document.getElementById('checkout-direccion-guardada');

  if (selectorDirecciones) {
    selectorDirecciones.addEventListener('change', () => {
      aplicarDireccionGuardadaCheckout(selectorDirecciones.value);
    });
  }
}

let direccionesGuardadasCheckout = [];

async function cargarDireccionesGuardadasCheckout() {
  const wrap = document.getElementById('checkout-direcciones-guardadas-wrap');
  const selector = document.getElementById('checkout-direccion-guardada');
  if (!wrap || !selector) return;

  if (!window.usuarioActual) {
    wrap.classList.add('oculto');
    return;
  }

  direccionesGuardadasCheckout = await obtenerDirecciones();

  if (!direccionesGuardadasCheckout.length) {
    wrap.classList.add('oculto');
    return;
  }

  selector.innerHTML = '<option value="">+ Escribir una dirección nueva</option>' +
    direccionesGuardadasCheckout.map(dir => `
      <option value="${dir.id}">${dir.nombre} — ${dir.calle}${dir.numero ? ' ' + dir.numero : ''}, ${dir.ciudad}</option>
    `).join('');

  wrap.classList.remove('oculto');

  // Si solo tiene una dirección guardada, se la proponemos de una vez.
  if (direccionesGuardadasCheckout.length === 1) {
    selector.value = direccionesGuardadasCheckout[0].id;
    aplicarDireccionGuardadaCheckout(direccionesGuardadasCheckout[0].id);
  }
}

function aplicarDireccionGuardadaCheckout(id) {
  const campoGuardar = document.getElementById('checkout-guardar-direccion');

  if (!id) {
    if (campoGuardar) campoGuardar.closest('label').classList.remove('oculto');
    return;
  }

  const direccion = direccionesGuardadasCheckout.find(dir => dir.id === id);
  if (!direccion) return;

  const campos = {
    'checkout-nombre': direccion.nombre,
    'checkout-cp': direccion.cp,
    'checkout-calle': direccion.calle,
    'checkout-numero': direccion.numero,
    'checkout-colonia': direccion.colonia,
    'checkout-ciudad': direccion.ciudad,
    'checkout-estado': direccion.estado,
    'checkout-telefono': direccion.telefono
  };

  Object.entries(campos).forEach(([idCampo, valor]) => {
    const input = document.getElementById(idCampo);
    if (input) input.value = valor || '';
  });

  const estadoTexto = document.getElementById('checkout-cp-estado');
  if (estadoTexto) estadoTexto.textContent = '';

  // Ya es una dirección guardada, no hace falta volver a guardarla.
  if (campoGuardar) {
    campoGuardar.checked = false;
    campoGuardar.closest('label').classList.add('oculto');
  }
}

async function guardarDireccionDesdeCheckout() {
  if (!window.usuarioActual || typeof window.guardarDireccionFirestore !== 'function') return;

  const direccion = obtenerDireccionCheckout();
  if (!direccion) return;

  try {
    await window.guardarDireccionFirestore(direccion);
  } catch (error) {
    console.error('No se pudo guardar la dirección desde el checkout:', error);
  }
}

async function buscarDatosPorCPCheckout() {
  const inputCp = document.getElementById('checkout-cp');
  const estadoTexto = document.getElementById('checkout-cp-estado');
  const cp = inputCp ? inputCp.value.trim() : '';

  if (cp.length !== 5) return;

  try {
    const respuesta = await fetch(`https://postali.app/api/v1/mx/cp/${cp}`);

    if (!respuesta.ok) {
      throw new Error('CP no encontrado');
    }

    const datos = await respuesta.json();

    const inputCiudad = document.getElementById('checkout-ciudad');
    const inputEstado = document.getElementById('checkout-estado');
    const listaColonias = document.getElementById('checkout-colonias-lista');

    if (inputCiudad) inputCiudad.value = datos.municipio || '';
    if (inputEstado) inputEstado.value = datos.estado || '';

    if (listaColonias) {
      listaColonias.innerHTML = (datos.asentamientos || [])
        .map(asentamiento => `<option value="${asentamiento.nombre}"></option>`)
        .join('');
    }

    if (estadoTexto) {
      estadoTexto.textContent = datos.municipio ? `${datos.municipio}, ${datos.estado}` : '';
    }
  } catch (error) {
    if (estadoTexto) estadoTexto.textContent = 'No se encontró ese código postal.';
    console.error('Error consultando el codigo postal:', error);
  }
}

function obtenerDireccionCheckout() {
  const campos = {
    nombre: document.getElementById('checkout-nombre'),
    cp: document.getElementById('checkout-cp'),
    calle: document.getElementById('checkout-calle'),
    numero: document.getElementById('checkout-numero'),
    colonia: document.getElementById('checkout-colonia'),
    ciudad: document.getElementById('checkout-ciudad'),
    estado: document.getElementById('checkout-estado'),
    telefono: document.getElementById('checkout-telefono')
  };

  const direccion = {};
  let faltante = null;

  Object.entries(campos).forEach(([clave, input]) => {
    const valor = input ? input.value.trim() : '';
    direccion[clave] = valor;

    if (input && input.required && !valor && !faltante) {
      faltante = input;
    }
  });

  if (faltante) {
    faltante.focus();
    return null;
  }

  return direccion;
}

async function procesarPagoCheckout(metodo) {
  const mensaje = document.getElementById('checkout-mensaje');

  if (!itemsCheckout.length) return;

  const direccion = obtenerDireccionCheckout();

  if (!direccion) {
    if (mensaje) mensaje.textContent = 'Completa tu dirección de entrega antes de pagar.';
    return;
  }

  if (mensaje) mensaje.textContent = '';

  const campoGuardar = document.getElementById('checkout-guardar-direccion');
  if (campoGuardar && campoGuardar.checked) {
    await guardarDireccionDesdeCheckout();
  }

  await iniciarPago(itemsCheckout, metodo, direccion);
}

function mostrarCuenta() {
  if (!window.usuarioActual) return;

  if (vistaInicio) vistaInicio.classList.add('oculto');
  if (vistaColeccion) vistaColeccion.classList.add('oculto');
  if (vistaProducto) vistaProducto.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.add('oculto');
  if (vistaCheckout) vistaCheckout.classList.add('oculto');
  if (vistaCuenta) vistaCuenta.classList.remove('oculto');

  renderizarInformacionCuenta();
  renderizarDirecciones();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

/* MIS PEDIDOS */

const PASOS_ESTATUS = ['Aceptado', 'En proceso', 'Pedido Aceptado', 'Enviado', 'Entregado'];

function armarBarraEstatus(estatusActual) {
  const indiceActual = PASOS_ESTATUS.indexOf(estatusActual);

  if (indiceActual === -1) {
    return `<p class="pedido-estatus-libre">${estatusActual}</p>`;
  }

  return `
    <div class="pedido-pasos">
      ${PASOS_ESTATUS.map((paso, index) => `
        <div class="pedido-paso ${index <= indiceActual ? 'completado' : ''} ${index === indiceActual ? 'actual' : ''}">
          <span class="pedido-paso-punto"></span>
          <span class="pedido-paso-texto">${paso}</span>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderizarPedidos() {
  const contenedor = document.getElementById('cuenta-pedidos-lista');
  if (!contenedor || !window.usuarioActual) return;

  contenedor.className = '';
  contenedor.innerHTML = '<p class="cuenta-vacio-texto">Cargando tus pedidos...</p>';

  try {
    const idToken = await window.obtenerTokenSesion();

    const respuesta = await fetch(obtenerBaseApi() + '/api/pedidos', {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    const pedidos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(pedidos.message || pedidos.error || 'No se pudieron cargar tus pedidos.');
    }

    if (!pedidos.length) {
      contenedor.className = 'cuenta-vacio';
      contenedor.innerHTML = '<p>Aún no tienes pedidos.</p>';
      return;
    }

    contenedor.innerHTML = pedidos.map(pedido => `
      <div class="pedido-card">
        <div class="pedido-card-header">
          <p class="pedido-id">Pedido ${pedido.idEnvio}</p>
        </div>

        ${armarBarraEstatus(pedido.estatus)}

        <div class="pedido-productos">
          ${pedido.productos.map(producto => `
            <p>${producto.nombre}${producto.talla ? ' - Talla ' + producto.talla : ''}${producto.color ? ' - ' + producto.color : ''}${producto.grip ? ' - ' + producto.grip : ''} × ${producto.cantidad}</p>
          `).join('')}
        </div>

        <p class="pedido-direccion">
          Entrega: ${pedido.direccion.calle} ${pedido.direccion.numero}, ${pedido.direccion.colonia}, ${pedido.direccion.ciudad}, ${pedido.direccion.estado}, CP ${pedido.direccion.cp}
        </p>
      </div>
    `).join('');
  } catch (error) {
    console.error('No se pudieron cargar los pedidos:', error);
    contenedor.className = 'cuenta-vacio';
    contenedor.innerHTML = '<p>No se pudieron cargar tus pedidos. Intenta de nuevo más tarde.</p>';
  }
}

/* CONFIRMAR PEDIDO AL VOLVER DE PAGAR CON CLIP */

// Ejecuta la función cuando ya se sabe si hay una sesión iniciada (Firebase tarda un instante).
function cuandoHayUsuario(funcion) {
  if (window.usuarioActual) {
    funcion();
    return;
  }

  let ejecutada = false;

  const ejecutar = () => {
    if (ejecutada) return;
    ejecutada = true;
    document.removeEventListener('usuario-actualizado', ejecutar);
    funcion();
  };

  document.addEventListener('usuario-actualizado', ejecutar);
  setTimeout(ejecutar, 4000);
}

async function confirmarLinkClipSiAplica() {
  const parametros = new URLSearchParams(window.location.search);
  const resultado = parametros.get('pago');

  if (resultado !== 'clip' && resultado !== 'clip_error') return;

  const idPago = sessionStorage.getItem('clip_payment_request_id');

  window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);

  if (resultado === 'clip_error') {
    sessionStorage.removeItem('clip_payment_request_id');
    alert('No se completó el pago con Clip. No se hizo ningún cobro. Puedes intentar de nuevo.');
    return;
  }

  if (!idPago) return;

  try {
    const respuesta = await fetch(obtenerBaseApi() + '/api/confirmar-link-clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentRequestId: idPago })
    });

    const datos = await respuesta.json();

    if (respuesta.ok && datos.ok) {
      sessionStorage.removeItem('clip_payment_request_id');

      cuandoHayUsuario(() => {
        carrito = [];
        guardarCarrito();
        actualizarContadorCarrito();
      });

      alert('¡Gracias por tu compra! Tu pedido ya quedó registrado y lo puedes ver en "Mi cuenta → Pedidos".');
      return;
    }

    alert('Tu pago todavía no se confirma. Si elegiste pagar en efectivo, tu pedido se registrará solo en cuanto recibamos el pago. Si ya pagaste con tarjeta, revisa "Mi cuenta → Pedidos" en unos minutos.');
  } catch (error) {
    console.error('No se pudo confirmar el pago con Clip:', error);
  }
}

/* CONFIRMAR PEDIDO AL VOLVER DE PAGAR (Mercado Pago / PayPal) */

async function confirmarPedidoSiAplica() {
  const parametros = new URLSearchParams(window.location.search);

  if (parametros.get('pago') !== 'aprobado') return;

  const paymentId = parametros.get('payment_id') || parametros.get('collection_id');
  const orderId = parametros.get('token');

  if (!paymentId && !orderId) return;

  const cuerpo = paymentId
    ? { proveedor: 'mercadopago', paymentId }
    : { proveedor: 'paypal', orderId };

  try {
    const respuesta = await fetch(obtenerBaseApi() + '/api/confirmar-pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });

    const datos = await respuesta.json();

    if (respuesta.ok && datos.ok) {
      carrito = [];
      guardarCarrito();
      actualizarContadorCarrito();
      alert('¡Gracias por tu compra! Tu pedido ya quedó registrado y lo puedes ver en "Mi cuenta → Pedidos".');
    }
  } catch (error) {
    console.error('No se pudo confirmar el pedido:', error);
  } finally {
    const urlLimpia = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, urlLimpia);
  }
}

/* PAGO DIRECTO CON TARJETA (Clip) */

// Esta es tu API Key de Clip (la pública, NO la clave secreta). La sacas de tu panel
// de desarrollador de Clip. La clave secreta va solo en Vercel, nunca aquí.
const CLIP_API_KEY = '03de9677-7a6d-4100-bd5a-9b25fe8f8ab0';

let clipTarjeta = null;

function obtenerTarjetaClip() {
  if (clipTarjeta) return clipTarjeta;
  if (!window.ClipSDK) return null;

  const clip = new window.ClipSDK(CLIP_API_KEY);
  clipTarjeta = clip.element.create('Card', { theme: 'light', locale: 'es' });
  clipTarjeta.mount('clip-card');

  return clipTarjeta;
}

function totalCheckout() {
  return itemsCheckout.reduce(
    (suma, item) => suma + Number(item.precio) * Number(item.cantidad),
    0
  );
}

function actualizarBotonClip() {
  const boton = document.getElementById('btn-confirmar-pago-clip');
  if (!boton) return;

  boton.textContent = `Pagar $${totalCheckout().toFixed(2)}`;
}

function configurarPagoClip() {
  const btnMostrar = document.getElementById('btn-mostrar-tarjeta-clip');
  const panel = document.getElementById('panel-tarjeta-clip');
  const btnPagar = document.getElementById('btn-confirmar-pago-clip');

  if (btnMostrar && panel) {
    btnMostrar.addEventListener('click', () => {
      panel.classList.toggle('oculto');

      if (!panel.classList.contains('oculto')) {
        actualizarBotonClip();
        // El formulario se monta ya con el panel visible para que tome bien su tamaño.
        obtenerTarjetaClip();
      }
    });
  }

  if (btnPagar) {
    btnPagar.addEventListener('click', pagarConTarjetaClip);
  }
}

function pagoClipExitoso() {
  carrito = [];
  guardarCarrito();
  actualizarContadorCarrito();

  alert('¡Gracias por tu compra! Tu pedido ya quedó registrado y lo puedes ver en "Mi cuenta → Pedidos".');

  window.location.href = window.location.origin + window.location.pathname;
}

async function pagarConTarjetaClip() {
  const mensaje = document.getElementById('checkout-mensaje');
  const boton = document.getElementById('btn-confirmar-pago-clip');

  if (!itemsCheckout.length) return;

  if (!window.usuarioActual) {
    pedirInicioSesion('Inicia sesión para pagar con tarjeta.');
    return;
  }

  const direccion = obtenerDireccionCheckout();

  if (!direccion) {
    if (mensaje) mensaje.textContent = 'Completa tu dirección de entrega antes de pagar.';
    return;
  }

  if (mensaje) mensaje.textContent = '';
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Procesando...';
  }

  try {
    const tarjeta = obtenerTarjetaClip();

    if (!tarjeta) {
      throw new Error('No se pudo cargar el formulario de tarjeta. Recarga la página e intenta de nuevo.');
    }

    let token;

    try {
      token = await tarjeta.cardToken();
    } catch (error) {
      throw new Error((error && error.message) || 'Revisa los datos de tu tarjeta.');
    }

    let prevencion = null;

    try {
      prevencion = await tarjeta.preventionData();
    } catch (error) {
      prevencion = null;
    }

    const campoGuardar = document.getElementById('checkout-guardar-direccion');
    if (campoGuardar && campoGuardar.checked) {
      await guardarDireccionDesdeCheckout();
    }

    const idToken = await window.obtenerTokenSesion();

    const respuesta = await fetch(obtenerBaseApi() + '/api/pagar-con-clip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        token: token.id,
        productos: itemsCheckout,
        direccion,
        prevention_data: prevencion
      })
    });

    const datos = await respuesta.json();

    if (datos.requiere3ds) {
      await validar3dsClip(datos.url, datos.paymentId);
      return;
    }

    if (!respuesta.ok || !datos.ok) {
      throw new Error(datos.mensaje || datos.error || 'No se pudo procesar el pago.');
    }

    pagoClipExitoso();
  } catch (error) {
    console.error('No se pudo pagar con tarjeta:', error);
    if (mensaje) mensaje.textContent = error.message || 'No se pudo procesar el pago.';
  } finally {
    if (boton) boton.disabled = false;
    actualizarBotonClip();
  }
}

// Muestra la ventana donde el banco pide validar la identidad (código por SMS o app)
// y, cuando termina, le pregunta al servidor si el pago quedó aprobado.
function validar3dsClip(url, paymentId) {
  return new Promise(resolver => {
    const mensaje = document.getElementById('checkout-mensaje');

    const contenedor = document.createElement('div');
    contenedor.className = 'clip-3ds-overlay';
    contenedor.innerHTML = `
      <button type="button" class="clip-3ds-cancelar">Cancelar</button>
      <iframe title="Validación del banco" src="${url}"></iframe>
    `;
    document.body.appendChild(contenedor);

    const origen = new URL(url).origin;

    function cerrar() {
      window.removeEventListener('message', alRecibirMensaje);
      contenedor.remove();
      resolver();
    }

    async function alRecibirMensaje(evento) {
      if (evento.origin !== origen) return;

      const idRetorno = evento.data && evento.data.paymentId;
      if (!idRetorno || idRetorno !== paymentId) return;

      window.removeEventListener('message', alRecibirMensaje);
      contenedor.remove();

      try {
        const idToken = await window.obtenerTokenSesion();

        const respuesta = await fetch(obtenerBaseApi() + '/api/confirmar-pago-clip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify({ paymentId: idRetorno })
        });

        const datos = await respuesta.json();

        if (respuesta.ok && datos.ok) {
          pagoClipExitoso();
        } else if (mensaje) {
          mensaje.textContent = datos.mensaje || 'No se pudo confirmar el pago.';
        }
      } catch (error) {
        console.error('No se pudo confirmar el pago con 3DS:', error);
        if (mensaje) mensaje.textContent = 'No se pudo confirmar el pago. Revisa "Mis pedidos" antes de intentar de nuevo.';
      }

      resolver();
    }

    window.addEventListener('message', alRecibirMensaje);

    contenedor.querySelector('.clip-3ds-cancelar').addEventListener('click', () => {
      if (mensaje) mensaje.textContent = 'Cancelaste la validación del banco. No se hizo ningún cobro.';
      cerrar();
    });
  });
}

/* TARJETAS GUARDADAS (Mercado Pago) */

// Esta es la llave PÚBLICA de Mercado Pago (no es secreta, está pensada para
// vivir en el navegador). Reemplázala por la tuya desde tu panel de
// Mercado Pago → Credenciales → Llave pública.
const MERCADO_PAGO_PUBLIC_KEY = 'TU_LLAVE_PUBLICA_DE_MERCADO_PAGO';

let instanciaMP = null;
let camposTarjetaCuentaMontados = false;
let camposCvvCheckoutMontados = false;
let tarjetaSeleccionadaCheckoutId = null;

function obtenerInstanciaMP() {
  if (!instanciaMP && window.MercadoPago) {
    instanciaMP = new window.MercadoPago(MERCADO_PAGO_PUBLIC_KEY, { locale: 'es-MX' });
  }

  return instanciaMP;
}

function montarCamposTarjetaCuenta() {
  if (camposTarjetaCuentaMontados) return;

  const mp = obtenerInstanciaMP();
  if (!mp) return;

  mp.fields.create('cardNumber', { placeholder: '•••• •••• •••• ••••' }).mount('tarjeta-numero');
  mp.fields.create('expirationDate', { placeholder: 'MM/AA' }).mount('tarjeta-vencimiento');
  mp.fields.create('securityCode', { placeholder: 'CVV' }).mount('tarjeta-cvv');

  camposTarjetaCuentaMontados = true;
}

function configurarFormularioTarjeta() {
  const formTarjeta = document.getElementById('form-tarjeta');
  if (!formTarjeta) return;

  formTarjeta.addEventListener('submit', async evento => {
    evento.preventDefault();

    if (!window.usuarioActual) {
      pedirInicioSesion('Inicia sesión para guardar una tarjeta.');
      return;
    }

    const mensaje = document.getElementById('tarjeta-mensaje');
    const boton = document.getElementById('btn-guardar-tarjeta');
    const nombreInput = document.getElementById('tarjeta-nombre');

    if (mensaje) mensaje.textContent = '';
    if (boton) boton.disabled = true;

    try {
      const mp = obtenerInstanciaMP();
      if (!mp) throw new Error('No se pudo cargar Mercado Pago. Intenta de nuevo.');

      const token = await mp.fields.createCardToken({
        cardholderName: nombreInput ? nombreInput.value.trim() : ''
      });

      const idToken = await window.obtenerTokenSesion();

      const respuesta = await fetch(obtenerBaseApi() + '/api/tarjetas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ token: token.id })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.message || datos.error || 'No se pudo guardar la tarjeta.');
      }

      formTarjeta.reset();
      if (mensaje) {
        mensaje.className = 'checkout-mensaje checkout-mensaje-ok';
        mensaje.textContent = 'Tarjeta guardada correctamente.';
      }

      renderizarTarjetasGuardadas();
    } catch (error) {
      console.error('No se pudo guardar la tarjeta:', error);
      if (mensaje) {
        mensaje.className = 'checkout-mensaje';
        mensaje.textContent = error.message || 'No se pudo guardar la tarjeta. Revisa los datos.';
      }
    } finally {
      if (boton) boton.disabled = false;
    }
  });
}

async function obtenerTarjetasGuardadas() {
  if (!window.usuarioActual) return [];

  const idToken = await window.obtenerTokenSesion();

  const respuesta = await fetch(obtenerBaseApi() + '/api/tarjetas', {
    headers: { Authorization: `Bearer ${idToken}` }
  });

  if (!respuesta.ok) return [];

  return respuesta.json();
}

async function renderizarTarjetasGuardadas() {
  const contenedor = document.getElementById('cuenta-tarjetas-lista');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="cuenta-vacio-texto">Cargando tarjetas...</p>';

  const tarjetas = await obtenerTarjetasGuardadas();

  if (!tarjetas.length) {
    contenedor.innerHTML = '<p class="cuenta-vacio-texto">Aún no tienes tarjetas guardadas.</p>';
    return;
  }

  contenedor.innerHTML = tarjetas.map(tarjeta => `
    <div class="direccion-card" data-id="${tarjeta.id}">
      <p><strong>${tarjeta.marca || 'Tarjeta'} terminada en ${tarjeta.ultimosDigitos}</strong></p>
      <p>Vence ${String(tarjeta.mesVencimiento).padStart(2, '0')}/${tarjeta.anioVencimiento}</p>
      ${tarjeta.titular ? `<p>${tarjeta.titular}</p>` : ''}
      <button type="button" class="btn-eliminar-direccion" data-id="${tarjeta.id}">Eliminar</button>
    </div>
  `).join('');

  contenedor.querySelectorAll('.btn-eliminar-direccion').forEach(boton => {
    boton.addEventListener('click', () => eliminarTarjetaGuardada(boton.dataset.id));
  });
}

async function eliminarTarjetaGuardada(id) {
  if (!window.usuarioActual) return;

  try {
    const idToken = await window.obtenerTokenSesion();

    await fetch(obtenerBaseApi() + '/api/tarjetas', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ cardId: id })
    });

    renderizarTarjetasGuardadas();
  } catch (error) {
    console.error('No se pudo eliminar la tarjeta:', error);
  }
}

/* PAGAR CON TARJETA GUARDADA (desde el checkout) */

function configurarPagoTarjetaGuardada() {
  const btnMostrar = document.getElementById('btn-mostrar-tarjetas-guardadas');
  const panel = document.getElementById('panel-tarjetas-guardadas');
  const btnConfirmar = document.getElementById('btn-confirmar-pago-tarjeta');

  if (btnMostrar && panel) {
    btnMostrar.addEventListener('click', async () => {
      if (!window.usuarioActual) {
        pedirInicioSesion('Inicia sesión para pagar con una tarjeta guardada.');
        return;
      }

      panel.classList.toggle('oculto');

      if (!panel.classList.contains('oculto')) {
        await cargarTarjetasCheckout();
      }
    });
  }

  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', confirmarPagoTarjetaGuardada);
  }
}

async function cargarTarjetasCheckout() {
  const lista = document.getElementById('checkout-tarjetas-lista');
  if (!lista) return;

  lista.innerHTML = '<p class="cuenta-vacio-texto">Cargando tus tarjetas...</p>';

  const tarjetas = await obtenerTarjetasGuardadas();

  if (!tarjetas.length) {
    lista.innerHTML = '<p class="cuenta-vacio-texto">No tienes tarjetas guardadas. Agrega una desde "Mi cuenta".</p>';
    return;
  }

  lista.innerHTML = tarjetas.map(tarjeta => `
    <button type="button" class="checkout-tarjeta-opcion" data-id="${tarjeta.id}">
      ${tarjeta.marca || 'Tarjeta'} •••• ${tarjeta.ultimosDigitos} — vence ${String(tarjeta.mesVencimiento).padStart(2, '0')}/${tarjeta.anioVencimiento}
    </button>
  `).join('');

  lista.querySelectorAll('.checkout-tarjeta-opcion').forEach(boton => {
    boton.addEventListener('click', () => {
      lista.querySelectorAll('.checkout-tarjeta-opcion').forEach(item => item.classList.remove('selected'));
      boton.classList.add('selected');
      tarjetaSeleccionadaCheckoutId = boton.dataset.id;

      const bloqueCvv = document.getElementById('checkout-cvv-bloque');
      if (bloqueCvv) bloqueCvv.classList.remove('oculto');

      if (!camposCvvCheckoutMontados) {
        const mp = obtenerInstanciaMP();
        if (mp) {
          mp.fields.create('securityCode', { placeholder: 'CVV' }).mount('checkout-cvv');
          camposCvvCheckoutMontados = true;
        }
      }
    });
  });
}

async function confirmarPagoTarjetaGuardada() {
  const mensaje = document.getElementById('checkout-mensaje');
  const boton = document.getElementById('btn-confirmar-pago-tarjeta');

  if (!tarjetaSeleccionadaCheckoutId) {
    if (mensaje) mensaje.textContent = 'Selecciona una tarjeta.';
    return;
  }

  const direccion = obtenerDireccionCheckout();

  if (!direccion) {
    if (mensaje) mensaje.textContent = 'Completa tu dirección de entrega antes de pagar.';
    return;
  }

  if (boton) boton.disabled = true;
  if (mensaje) mensaje.textContent = '';

  const campoGuardar = document.getElementById('checkout-guardar-direccion');
  if (campoGuardar && campoGuardar.checked) {
    await guardarDireccionDesdeCheckout();
  }

  try {
    const mp = obtenerInstanciaMP();
    if (!mp) throw new Error('No se pudo cargar Mercado Pago.');

    const token = await mp.fields.createCardToken({ cardId: tarjetaSeleccionadaCheckoutId });
    const idToken = await window.obtenerTokenSesion();

    const respuesta = await fetch(obtenerBaseApi() + '/api/pagar-con-tarjeta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ token: token.id, productos: itemsCheckout, direccion })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || datos.ok === false) {
      throw new Error(datos.mensaje || datos.message || datos.error || 'No se pudo procesar el pago.');
    }

    carrito = [];
    guardarCarrito();
    actualizarContadorCarrito();

    window.location.href = `${window.location.origin}${window.location.pathname}?pago=aprobado`;
  } catch (error) {
    console.error('No se pudo pagar con la tarjeta guardada:', error);
    if (mensaje) mensaje.textContent = error.message || 'No se pudo procesar el pago.';
  } finally {
    if (boton) boton.disabled = false;
  }
}

function configurarCuenta() {
  document.querySelectorAll('.cuenta-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cuenta-tab').forEach(item => item.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.cuenta-panel').forEach(panel => panel.classList.add('oculto'));

      const panel = document.getElementById(`cuenta-panel-${tab.dataset.tab}`);
      if (panel) panel.classList.remove('oculto');

      if (tab.dataset.tab === 'tarjetas') {
        montarCamposTarjetaCuenta();
        renderizarTarjetasGuardadas();
      }

      if (tab.dataset.tab === 'pedidos') {
        renderizarPedidos();
      }
    });
  });

  const formDireccion = document.getElementById('form-direccion');

  if (formDireccion) {
    formDireccion.addEventListener('submit', event => {
      event.preventDefault();
      guardarNuevaDireccion();
      formDireccion.reset();

      const estadoTexto = document.getElementById('dir-cp-estado');
      if (estadoTexto) estadoTexto.textContent = '';
    });
  }

  const inputCp = document.getElementById('dir-cp');

  if (inputCp) {
    inputCp.addEventListener('input', () => {
      inputCp.value = inputCp.value.replace(/\D/g, '').slice(0, 5);

      if (inputCp.value.length === 5) {
        buscarDatosPorCP();
      }
    });
  }

  document.addEventListener('abrir-mi-cuenta', mostrarCuenta);

  document.addEventListener('usuario-actualizado', () => {
    if (window.usuarioActual) {
      renderizarInformacionCuenta();
    } else if (vistaCuenta && !vistaCuenta.classList.contains('oculto')) {
      mostrarInicio();
    }
  });
}

function renderizarInformacionCuenta() {
  const usuario = window.usuarioActual;
  if (!usuario) return;

  const infoNombre = document.getElementById('cuenta-info-nombre');
  const infoCorreo = document.getElementById('cuenta-info-correo');

  if (infoNombre) infoNombre.textContent = usuario.displayName || 'Sin nombre registrado';
  if (infoCorreo) infoCorreo.textContent = usuario.email || '-';
}

/* CODIGO POSTAL */

async function buscarDatosPorCP() {
  const inputCp = document.getElementById('dir-cp');
  const estadoTexto = document.getElementById('dir-cp-estado');
  const cp = inputCp ? inputCp.value.trim() : '';

  if (cp.length !== 5) return;

  try {
    const respuesta = await fetch(`https://postali.app/api/v1/mx/cp/${cp}`);

    if (!respuesta.ok) {
      throw new Error('CP no encontrado');
    }

    const datos = await respuesta.json();

    const inputCiudad = document.getElementById('dir-ciudad');
    const inputEstado = document.getElementById('dir-estado');
    const listaColonias = document.getElementById('dir-colonias-lista');

    if (inputCiudad) inputCiudad.value = datos.municipio || '';
    if (inputEstado) inputEstado.value = datos.estado || '';

    if (listaColonias) {
      listaColonias.innerHTML = (datos.asentamientos || [])
        .map(asentamiento => `<option value="${asentamiento.nombre}"></option>`)
        .join('');
    }

    if (estadoTexto) {
      estadoTexto.textContent = datos.municipio ? `${datos.municipio}, ${datos.estado}` : '';
    }
  } catch (error) {
    if (estadoTexto) estadoTexto.textContent = 'No se encontró ese código postal.';
    console.error('Error consultando el codigo postal:', error);
  }
}

async function obtenerDirecciones() {
  if (!window.usuarioActual || typeof window.obtenerDireccionesFirestore !== 'function') return [];

  try {
    return await window.obtenerDireccionesFirestore();
  } catch (error) {
    console.error('No se pudieron cargar las direcciones:', error);
    return [];
  }
}

async function guardarNuevaDireccion() {
  if (!window.usuarioActual || typeof window.guardarDireccionFirestore !== 'function') return;

  const direccion = {
    nombre: document.getElementById('dir-nombre').value.trim(),
    calle: document.getElementById('dir-calle').value.trim(),
    numero: document.getElementById('dir-numero').value.trim(),
    colonia: document.getElementById('dir-colonia').value.trim(),
    ciudad: document.getElementById('dir-ciudad').value.trim(),
    estado: document.getElementById('dir-estado').value.trim(),
    cp: document.getElementById('dir-cp').value.trim(),
    telefono: document.getElementById('dir-telefono').value.trim()
  };

  try {
    await window.guardarDireccionFirestore(direccion);
    await renderizarDirecciones();
  } catch (error) {
    console.error('No se pudo guardar la direccion:', error);
    alert('No se pudo guardar la dirección. Intenta de nuevo.');
  }
}

async function eliminarDireccion(id) {
  if (!window.usuarioActual || typeof window.eliminarDireccionFirestore !== 'function') return;

  try {
    await window.eliminarDireccionFirestore(id);
    await renderizarDirecciones();
  } catch (error) {
    console.error('No se pudo eliminar la direccion:', error);
  }
}

async function renderizarDirecciones() {
  const contenedor = document.getElementById('cuenta-direcciones-lista');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="cuenta-vacio-texto">Cargando direcciones...</p>';

  const direcciones = await obtenerDirecciones();

  if (direcciones.length === 0) {
    contenedor.innerHTML = '<p class="cuenta-vacio-texto">Aún no tienes direcciones guardadas.</p>';
    return;
  }

  contenedor.innerHTML = direcciones.map(dir => `
    <div class="direccion-card" data-id="${dir.id}">
      <p><strong>${dir.nombre}</strong></p>
      <p>${dir.calle}${dir.numero ? ' ' + dir.numero : ''}${dir.colonia ? ', ' + dir.colonia : ''}</p>
      <p>${dir.ciudad}, ${dir.estado}, CP ${dir.cp}</p>
      ${dir.telefono ? `<p>Tel: ${dir.telefono}</p>` : ''}
      <button type="button" class="btn-eliminar-direccion" data-id="${dir.id}">Eliminar</button>
    </div>
  `).join('');

  contenedor.querySelectorAll('.btn-eliminar-direccion').forEach(boton => {
    boton.addEventListener('click', () => {
      eliminarDireccion(boton.dataset.id);
    });
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
        <p>Color: ${item.color || 'Único'}</p>
        <p>Talla: ${item.talla || 'Sin talla'}</p>
        ${item.grip ? `<p>Grip: ${item.grip}</p>` : ''}
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
  const clave = claveCarritoUsuario();
  if (!clave) return;

  localStorage.setItem(clave, JSON.stringify(carrito));
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

function renderizarGrip(gripTexto) {
  const gripGrid = document.querySelector('.grip-grid');
  const gripOpcion = document.querySelector('.grip-opcion');
  if (!gripGrid || !gripOpcion) return;

  const opciones = obtenerLista(gripTexto);

  gripGrid.innerHTML = '';
  gripSeleccionado = '';

  if (opciones.length === 0) {
    gripOpcion.classList.add('oculto');
    return;
  }

  gripOpcion.classList.remove('oculto');
  gripSeleccionado = opciones[0];

  opciones.forEach((grip, index) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = grip;

    if (index === 0) {
      boton.classList.add('selected');
    }

    boton.addEventListener('click', () => {
      gripSeleccionado = grip;

      document.querySelectorAll('.grip-grid button').forEach(btn => {
        btn.classList.remove('selected');
      });

      boton.classList.add('selected');
    });

    gripGrid.appendChild(boton);
  });
}
function armarProductoParaPagar() {
  const tallaSeleccionada = document.querySelector('.size-grid button.selected');
  const gripSeleccionadoBoton = document.querySelector('.grip-grid button.selected');

  return {
    nombre: productoActual.name || productoActual.nombre || 'Producto',
    precio: varianteActual
      ? Number(varianteActual.precio || varianteActual.price)
      : Number(productoActual.price || productoActual.precio),
    cantidad: Math.max(1, Number(cantidadProducto) || 1),
    talla: tallaSeleccionada ? tallaSeleccionada.textContent.trim() : '',
    grip: gripSeleccionadoBoton ? gripSeleccionadoBoton.textContent.trim() : '',
    color: varianteActual ? varianteActual.color : 'Único'
  };
}

if (btnComprarAhora) {
  btnComprarAhora.addEventListener('click', () => {
    if (!productoActual) return;
    mostrarCheckout([armarProductoParaPagar()]);
  });
}

if (btnFinalizarCompra) {
  btnFinalizarCompra.addEventListener('click', () => {
    if (!carrito.length) return;

    const itemsCarrito = carrito.map(item => ({
      nombre: item.nombre,
      precio: Number(item.precio),
      cantidad: item.cantidad,
      talla: item.talla && item.talla !== 'Sin talla' ? item.talla : '',
      color: item.color,
      grip: item.grip || ''
    }));

    mostrarCheckout(itemsCarrito);
  });
}

if (btnPagarMercadoPago) {
  btnPagarMercadoPago.addEventListener('click', () => {
    procesarPagoCheckout('mercadopago');
  });
}

// Antes este botón abría un link fijo de Clip (https://pago.clip.mx/6272e5d6-...), que cobraba
// siempre el mismo monto. Ahora el servidor genera un link por pedido, con el monto exacto.

function irA(url) {
  window.location.href = url;
}

async function pagarConClip() {
  const mensaje = document.getElementById('checkout-mensaje');
  const boton = document.getElementById('btn-pagar-clip');

  if (!itemsCheckout.length) return;

  if (!window.usuarioActual) {
    pedirInicioSesion('Inicia sesión para pagar con Clip.');
    return;
  }

  const direccion = obtenerDireccionCheckout();

  if (!direccion) {
    if (mensaje) mensaje.textContent = 'Completa tu dirección de entrega antes de pagar.';
    return;
  }

  if (mensaje) mensaje.textContent = '';

  const textoOriginal = boton ? boton.textContent : '';

  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Abriendo Clip...';
  }

  try {
    const campoGuardar = document.getElementById('checkout-guardar-direccion');
    if (campoGuardar && campoGuardar.checked) {
      await guardarDireccionDesdeCheckout();
    }

    const idToken = await window.obtenerTokenSesion();

    const respuesta = await fetch(obtenerBaseApi() + '/api/crear-link-clip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        productos: itemsCheckout,
        direccion,
        urlRetorno: window.location.origin + window.location.pathname
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.ok) {
      throw new Error(datos.mensaje || 'No se pudo generar el link de pago.');
    }

    // Guardamos el identificador para confirmar el pago cuando el cliente regrese.
    sessionStorage.setItem('clip_payment_request_id', datos.paymentRequestId);

    irA(datos.url);
  } catch (error) {
    console.error('No se pudo pagar con Clip:', error);
    if (mensaje) mensaje.textContent = error.message || 'No se pudo abrir Clip.';

    if (boton) {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  }
}

if (btnPagarClip) {
  btnPagarClip.addEventListener('click', pagarConClip);
}

if (btnPagarPaypal) {
  btnPagarPaypal.addEventListener('click', () => {
    procesarPagoCheckout('paypal');
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
  vistaCuenta?.classList.add('oculto');
  vistaCheckout?.classList.add('oculto');
  vistaColeccion?.classList.remove('oculto');

  if (tituloCatalogo) tituloCatalogo.textContent = `Busqueda: ${termino}`;
  if (descripcionCatalogo) descripcionCatalogo.textContent = `${resultados.length} producto(s) encontrado(s)`;

  resetearFiltros();
  renderizarFiltros(productosColeccionActual);
  mostrarProductos(productosColeccionActual);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const URL_BACKEND_VERCEL = 'https://tienda-alpha-red.vercel.app';

function obtenerBaseApi() {
  const host = window.location.hostname;

  // Solo en GitHub Pages (hosting estático, sin servidor) se usa el backend de Vercel.
  // En localhost, en Vercel y en tu dominio propio (inequestrian.com.mx), la API
  // vive en el mismo dominio que la página.
  if (host.endsWith('github.io')) {
    return URL_BACKEND_VERCEL;
  }

  return '';
}

async function iniciarPago(productosParaPagar, metodo = 'mercadopago', direccion = null) {
  const ruta = metodo === 'paypal' ? '/api/crear-pago-paypal' : '/api/crear-pago';
  const endpoint = obtenerBaseApi() + ruta;

  try {
    const idToken = window.usuarioActual ? await window.obtenerTokenSesion() : null;

    const respuesta = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
      },
      body: JSON.stringify({
        productos: productosParaPagar,
        direccion,
        urlRetorno: window.location.origin + window.location.pathname
      })
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(data.message || data.error || 'No se pudo iniciar el pago');
    }

    window.location.href = data.init_point;
  } catch (error) {
    alert('No se pudo iniciar el pago: ' + error.message);
  }
}