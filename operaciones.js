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
  colores: [],
  precioMin: '',
  precioMax: '',
  orden: 'default'
};

document.addEventListener('DOMContentLoaded', () => {
  cargarVideoInicio();
  prepararRutaInicial();
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
  confirmarStripeSiAplica();
});

function configurarMenu() {
  const dropdowns = Array.from(document.querySelectorAll('.menu-principal'));
  const dropdown = {
    classList: {
      remove: () => dropdowns.forEach(d => d.classList.remove('open'))
    }
  };
  const btnInicio = document.getElementById('btn-inicio');
  const logoInicio = document.getElementById('logo-inicio');

  if (logoInicio) {
    logoInicio.addEventListener('click', event => {
      event.preventDefault();
      mostrarInicio();
      dropdown.classList.remove('open');
    });
  }

  dropdowns.forEach(item => {
    const boton = item.querySelector('.dropdown-btn');
    if (!boton) return;

    boton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const abrir = !item.classList.contains('open');
      dropdown.classList.remove('open');
      if (abrir) item.classList.add('open');
    });

    item.addEventListener('click', event => {
      event.stopPropagation();
    });
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });

  document.querySelectorAll('.category-btn').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      const category = button.closest('.menu-category');

      button.closest('.dropdown-menu').querySelectorAll('.menu-category').forEach(item => {
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
      filtrarProductos(categoria, button.dataset.subcategoriaHome || '');
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
      // Si se entró directo al producto por un link, no hay colección previa: se usa la del producto.
      if (!ultimaCategoria && productoActual && productoActual.categoria) {
        filtrarProductos(productoActual.categoria, productoActual.subcategoria);
        return;
      }

      mostrarColeccionActual();

      if (ultimaCategoria === 'Busqueda') {
        actualizarRuta('/buscar?q=' + encodeURIComponent(ultimaSubcategoria));
      } else if (ultimaCategoria) {
        actualizarRuta(rutaDeColeccion(ultimaCategoria, ultimaSubcategoria));
      }
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
  const btnSeguir = document.getElementById('btn-seguir-comprando');
  if (btnSeguir) {
    btnSeguir.addEventListener('click', () => mostrarInicio());
  }

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

// Un producto es válido si trae nombre, precio e imagen. Google Sheets a veces entrega
// el CSV con celdas vacías por un instante; esos productos se ven rotos (sin foto, sin nombre, $0).
function productoCompleto(producto) {
  const variantes = producto.variantes || [];
  const imagenOk = Boolean(producto.image_url) && variantes.every(v => Boolean(v.image_url));

  return Boolean(producto.nombre) && Number(producto.precio) > 0 && imagenOk;
}

// El catálogo se guarda en el navegador: la próxima visita muestra los productos al instante
// y en segundo plano se actualiza con lo más reciente del Sheet.
const CLAVE_CATALOGO = 'catalogo_v1';
const VIGENCIA_CATALOGO = 7 * 24 * 60 * 60 * 1000;

function leerCatalogoGuardado() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_CATALOGO));
    if (datos && datos.p && datos.v && Date.now() - datos.t < VIGENCIA_CATALOGO) return datos;
  } catch (error) { /* sin catálogo guardado */ }

  return null;
}

function guardarCatalogo(productosRows, variantesRows) {
  try {
    localStorage.setItem(CLAVE_CATALOGO, JSON.stringify({ t: Date.now(), p: productosRows, v: variantesRows }));
  } catch (error) { /* si no hay espacio o está bloqueado, no pasa nada */ }
}

function vistaListaVisible() {
  const oculta = vista => !vista || vista.classList.contains('oculto');
  return !oculta(vistaInicio) || !oculta(vistaColeccion);
}

async function cargarProductos() {
  const INTENTOS = 4;
  let ultimoError = null;
  let lista = [];
  let filas = null;

  // 1) Si hay catálogo guardado, se muestra de inmediato.
  const guardado = leerCatalogoGuardado();
  let usoGuardado = false;

  if (guardado) {
    const listaGuardada = crearProductosDesdeSheets(guardado.p, guardado.v).filter(productoCompleto);

    if (listaGuardada.length) {
      productos = listaGuardada;
      usoGuardado = true;
      aplicarRutaActual();
      precalentarImagenes();
    }
  }

  // 1b) Primera visita (sin catálogo guardado en el navegador): se usa la copia del catálogo
  // que vive en la propia tienda, que llega mucho más rápido que Google Sheets.
  if (!usoGuardado && window.__snapshotTemprano) {
    try {
      const copia = await Promise.race([
        window.__snapshotTemprano,
        new Promise(resolve => setTimeout(() => resolve(null), 3000))
      ]);

      if (copia && typeof copia.p === 'string' && typeof copia.v === 'string') {
        const listaCopia = crearProductosDesdeSheets(parsearCsv(copia.p), parsearCsv(copia.v)).filter(productoCompleto);

        if (listaCopia.length) {
          productos = listaCopia;
          usoGuardado = true;
          aplicarRutaActual();
          precalentarImagenes();
        }
      }
    } catch (error) { /* si la copia no sirve, se usa el Sheet en vivo */ }
  }

  // 2) Se pide el catálogo actual al Sheet (con reintentos si llega incompleto).
  for (let intento = 0; intento < INTENTOS; intento++) {
    try {
      // En los reintentos se agrega un parámetro distinto para saltarse cualquier copia a medias en caché.
      const extra = intento === 0 ? '' : `&t=${Date.now()}`;

      const [productosRows, variantesRows] = await Promise.all([
        leerCsvDirecto(PRODUCTOS_CSV_URL + extra),
        leerCsvDirecto(VARIANTES_CSV_URL + extra)
      ]);

      lista = crearProductosDesdeSheets(productosRows, variantesRows);
      filas = { productosRows, variantesRows };
      ultimoError = null;

      if (lista.every(productoCompleto)) break;
    } catch (error) {
      ultimoError = error;
    }

    if (intento < INTENTOS - 1) {
      await new Promise(resolve => setTimeout(resolve, 700 * (intento + 1)));
    }
  }

  if (ultimoError && !lista.length) {
    // Sin internet o Sheets caído: si ya se mostró el catálogo guardado, se deja así.
    if (usoGuardado) return;

    console.error('Error cargando productos:', ultimoError);
    document.documentElement.classList.remove('cargando-ruta');

    const mensaje = `<p>No se pudieron cargar los productos. Recarga la página en unos segundos.</p>`;

    if (contenedorProductos) {
      contenedorProductos.innerHTML = mensaje;
    }

    if (productosDestacados) {
      productosDestacados.innerHTML = mensaje;
    }
    return;
  }

  // Lo que siga incompleto después de reintentar no se muestra, para que el cliente nunca vea tarjetas rotas.
  const incompletos = lista.filter(producto => !productoCompleto(producto));
  if (incompletos.length) {
    console.warn('Productos ocultos por datos incompletos en el Sheet:', incompletos.map(p => p.slug || p.id));
  }

  const nuevos = lista.filter(productoCompleto);

  if (filas && !incompletos.length) {
    guardarCatalogo(filas.productosRows, filas.variantesRows);
  }

  if (usoGuardado) {
    // Solo se vuelve a dibujar si algo cambió y el cliente está viendo el inicio o una colección.
    if (JSON.stringify(nuevos) !== JSON.stringify(productos)) {
      productos = nuevos;
      if (vistaListaVisible()) aplicarRutaActual();
    }
    precalentarImagenes();
    return;
  }

  productos = nuevos;
  aplicarRutaActual();
  precalentarImagenes();
}

async function leerCsvDirecto(url) {
  // Si la página ya pidió este CSV al arrancar (script del <head>), se usa esa respuesta una sola vez.
  const temprano = window.__catalogoTemprano && window.__catalogoTemprano[url];
  if (temprano) {
    delete window.__catalogoTemprano[url];
    try {
      return parsearCsv(await temprano);
    } catch (error) {
      // Si esa petición falló, se vuelve a pedir normalmente.
    }
  }

  // Siempre se pide una copia nueva: sin el parámetro t, el navegador puede reutilizar hasta 5 minutos
  // una respuesta vieja del Sheet y un cambio de precio tardaría en verse.
  const response = await fetch(url.includes('&t=') ? url : url + '&t=' + Date.now());

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

/* RUTAS: cada sección tiene su propia URL (ej. /maximilian-hombre-jackets-hoodies) */

let aplicandoRuta = false;

function slugTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function etiquetaMenuColeccion(categoria, subcategoria) {
  const enlace = Array.from(document.querySelectorAll('a[data-categoria][data-subcategoria]'))
    .find(a => a.dataset.categoria === categoria && a.dataset.subcategoria === subcategoria);

  return enlace ? enlace.textContent.trim() : subcategoria;
}

function rutaDeColeccion(categoria, subcategoria) {
  const esPropio = String(categoria).toLowerCase() === 'propio';
  const partes = [esPropio ? 'in-collection' : 'maximilian'];

  if (!esPropio) partes.push(slugTexto(categoria));
  if (subcategoria) partes.push(slugTexto(etiquetaMenuColeccion(categoria, subcategoria)));

  return '/' + partes.filter(Boolean).join('-');
}

function tablaDeRutas() {
  const tabla = {};

  document.querySelectorAll('[data-categoria]').forEach(enlace => {
    const categoria = enlace.dataset.categoria;
    const subcategoria = enlace.dataset.subcategoria || '';
    tabla[rutaDeColeccion(categoria, subcategoria)] = { categoria, subcategoria };
  });

  document.querySelectorAll('[data-categoria-home]').forEach(boton => {
    const categoria = boton.dataset.categoriaHome;
    const subcategoria = boton.dataset.subcategoriaHome || '';
    tabla[rutaDeColeccion(categoria, subcategoria)] = { categoria, subcategoria };
  });

  return tabla;
}

function actualizarRuta(ruta, reemplazar) {
  if (aplicandoRuta) return;

  try {
    // En el inicio se conserva la URL tal cual (por ejemplo, el ?pago=... al volver de pagar).
    if (ruta === '/' && window.location.pathname === '/') return;

    if (window.location.pathname + window.location.search === ruta) return;

    if (reemplazar) {
      window.history.replaceState({}, '', ruta);
    } else {
      window.history.pushState({}, '', ruta);
    }
  } catch (error) {
    // Si el navegador no permite cambiar la URL (por ejemplo, abriendo el archivo directo), no pasa nada.
  }
}

// Ejecuta una acción de ruta sin que cambie la URL (la URL ya es la correcta).
function conRutaAplicada(accion) {
  aplicandoRuta = true;

  try {
    accion();
  } finally {
    aplicandoRuta = false;
    document.documentElement.classList.remove('cargando-ruta');
  }
}

// Espera a que Firebase diga si hay sesión o no (tarda un instante al cargar la página).
function esperarSesion(accion) {
  if (window.usuarioActual !== undefined) {
    accion();
    return;
  }

  let ejecutada = false;

  const ejecutar = () => {
    if (ejecutada) return;
    ejecutada = true;
    document.removeEventListener('usuario-actualizado', ejecutar);
    accion();
  };

  document.addEventListener('usuario-actualizado', ejecutar);
  setTimeout(ejecutar, 6000);
}

const RUTAS_ESPECIALES = ['/producto', '/buscar', '/carrito', '/checkout', '/cuenta'];

// Al entrar directo a un link de categoría, se muestra de inmediato la vista de colección
// (con su título) mientras llega el catálogo, en lugar de mostrar el inicio un momento.
function prepararRutaInicial() {
  const ruta = window.location.pathname.replace(/\/+$/, '').replace(/\/index\.html$/, '');
  if (!ruta) return;

  const destino = tablaDeRutas()[ruta];
  if (!destino) {
    // Producto, búsqueda, carrito o cuenta: solo se oculta el inicio mientras carga.
    if (!RUTAS_ESPECIALES.includes(ruta)) {
      document.documentElement.classList.remove('cargando-ruta');
    }
    return;
  }

  document.documentElement.classList.add('ruta-coleccion');

  const esPropio = String(destino.categoria).toLowerCase() === 'propio';

  if (tituloCatalogo) tituloCatalogo.textContent = destino.subcategoria || destino.categoria;
  if (descripcionCatalogo) {
    descripcionCatalogo.textContent = (esPropio ? 'IN Collection' : 'Maximilian' + ' - ' + destino.categoria) +
      (destino.subcategoria ? ' - ' + etiquetaMenuColeccion(destino.categoria, destino.subcategoria) : '');
  }
  if (contenedorProductos) contenedorProductos.innerHTML = '<p class="mensaje-vacio">Cargando...</p>';
}

function aplicarRutaActual() {
  const ruta = window.location.pathname.replace(/\/+$/, '').replace(/\/index\.html$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const destino = ruta === '/' ? null : tablaDeRutas()[ruta];

  // Cuenta, carrito y checkout necesitan saber si hay sesión: se resuelven más abajo.
  if (ruta === '/cuenta' || ruta === '/carrito' || ruta === '/checkout') {
    esperarSesion(() => conRutaAplicada(() => aplicarRutaPrivada(ruta, params)));
    return;
  }

  conRutaAplicada(() => {
    if (destino) {
      filtrarProductos(destino.categoria, destino.subcategoria);
    } else if (ruta === '/producto') {
      aplicarRutaProducto(params);
    } else if (ruta === '/buscar') {
      aplicarRutaBusqueda(params);
    } else {
      if (ruta !== '/') {
        try { window.history.replaceState({}, '', '/' + window.location.search); } catch (error) { /* sin cambios */ }
      }
      mostrarInicio();
    }
  });
}

function volverAlInicioPorRuta() {
  try { window.history.replaceState({}, '', '/'); } catch (error) { /* sin cambios */ }
  mostrarInicio();
}

// /producto?p=slug&color=negro&talla=M
function aplicarRutaProducto(params) {
  const slug = params.get('p');
  const producto = productos.find(item => item.slug === slug);

  if (!producto) {
    volverAlInicioPorRuta();
    return;
  }

  mostrarDetalleProducto(producto);

  const colorBuscado = slugTexto(params.get('color') || '');
  const variantes = producto.variantes || [];

  if (colorBuscado && variantes.length) {
    const indice = variantes.findIndex(variante => slugTexto(variante.color) === colorBuscado);
    const tarjetas = colorOptions ? colorOptions.querySelectorAll('.color-card') : [];

    if (indice >= 0 && tarjetas[indice]) tarjetas[indice].click();
  }

  const tallaBuscada = String(params.get('talla') || '').trim().toLowerCase();

  if (tallaBuscada) {
    const boton = Array.from(document.querySelectorAll('.size-grid button'))
      .find(item => item.textContent.trim().toLowerCase() === tallaBuscada);

    if (boton) boton.click();
  }
}

// /buscar?q=negro
function aplicarRutaBusqueda(params) {
  const termino = (params.get('q') || '').trim();

  if (!termino) {
    volverAlInicioPorRuta();
    return;
  }

  if (inputBusqueda) inputBusqueda.value = termino;
  mostrarBusquedaComoColeccion(obtenerResultadosBusqueda(termino), termino);
}

// /cuenta?seccion=pedidos, /carrito, /checkout
function aplicarRutaPrivada(ruta, params) {
  if (!window.usuarioActual) {
    volverAlInicioPorRuta();
    pedirInicioSesion(ruta === '/cuenta' ? 'Inicia sesión para ver tu cuenta.' : 'Inicia sesión para ver tu carrito.');
    return;
  }

  if (ruta === '/cuenta') {
    mostrarCuenta(params.get('seccion') || 'informacion');
    return;
  }

  // El checkout no se puede reconstruir al recargar: se muestra el carrito.
  if (ruta === '/checkout') {
    try { window.history.replaceState({}, '', '/carrito'); } catch (error) { /* sin cambios */ }
  }

  mostrarCarrito();
}

window.addEventListener('popstate', () => {
  if (productos && productos.length) aplicarRutaActual();
});

// El video solo se descarga cuando se va a ver el inicio (no si entran directo a una categoría o producto).
function cargarVideoInicio(forzar) {
  const video = document.querySelector('.video-bg[data-src]');
  if (!video) return;

  const ruta = window.location.pathname.replace(/\/+$/, '').replace(/\/index\.html$/, '');
  if (ruta && forzar !== true) return;

  video.src = video.dataset.src;
  video.removeAttribute('data-src');

  const reproducir = video.play();
  if (reproducir && reproducir.catch) reproducir.catch(() => {});
}

function mostrarInicio() {
  cargarVideoInicio(true);
  actualizarRuta('/');
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
  actualizarRuta(rutaDeColeccion(categoria, subcategoria));
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
    const marcaCatalogo = normalizar(categoria) === 'propio' ? 'IN Collection' : 'Maximilian';
    descripcionCatalogo.textContent = marcaCatalogo + (categoria && marcaCatalogo === 'Maximilian' ? ' - ' + categoria : '') + (subcategoria ? ' - ' + subcategoria : '');
  }

  mostrarColeccionActual();

  // Solo en IN Collection > Socks: selector Adultos / YR
  const esSocks = normalizar(categoria) === 'propio' && normalizar(subcategoria) === 'socks';
  coleccionSocksBase = esSocks ? filtrados : null;
  edadSocks = 'adultos';
  actualizarSelectorEdad();

  productosColeccionActual = esSocks ? filtrarSocksPorEdad(filtrados, edadSocks) : filtrados;
  resetearFiltros();
  renderizarFiltros(productosColeccionActual);
  mostrarProductos(productosColeccionActual);
}

/* SOCKS: adultos / YR */
let coleccionSocksBase = null;
let edadSocks = 'adultos';

function esProductoYR(product) {
  return /^\s*yr\b/i.test(String(product.name || product.nombre || ''));
}

function filtrarSocksPorEdad(lista, edad) {
  return lista.filter(p => (edad === 'yr') === esProductoYR(p));
}

function actualizarSelectorEdad() {
  const selector = document.getElementById('selector-edad');
  const etiqueta = document.getElementById('edad-etiqueta');
  const menu = document.getElementById('menu-edad');
  const boton = document.getElementById('btn-edad');
  if (!selector) return;

  selector.classList.toggle('oculto', !coleccionSocksBase);
  if (etiqueta) etiqueta.textContent = edadSocks === 'yr' ? 'YR' : 'Adultos';
  if (menu) menu.classList.add('oculto');
  if (boton) boton.setAttribute('aria-expanded', 'false');
}

function configurarSelectorEdad() {
  const boton = document.getElementById('btn-edad');
  const menu = document.getElementById('menu-edad');
  if (!boton || !menu) return;

  boton.addEventListener('click', (e) => {
    e.stopPropagation();
    const abierto = menu.classList.toggle('oculto') === false;
    boton.setAttribute('aria-expanded', String(abierto));
  });

  menu.querySelectorAll('[data-edad]').forEach(opcion => {
    opcion.addEventListener('click', () => {
      if (!coleccionSocksBase) return;
      edadSocks = opcion.dataset.edad === 'yr' ? 'yr' : 'adultos';
      actualizarSelectorEdad();
      productosColeccionActual = filtrarSocksPorEdad(coleccionSocksBase, edadSocks);
      resetearFiltros();
      renderizarFiltros(productosColeccionActual);
      mostrarProductos(productosColeccionActual);
    });
  });

  document.addEventListener('click', () => {
    menu.classList.add('oculto');
    boton.setAttribute('aria-expanded', 'false');
  });
}
configurarSelectorEdad();

function mostrarProductos(lista, esBusqueda) {
  if (!contenedorProductos) return;

  contenedorProductos.innerHTML = '';

  if (!lista || lista.length === 0) {
    if (esBusqueda) {
      contenedorProductos.innerHTML = '<p class="mensaje-vacio">No se encontraron productos.</p>';
      return;
    }
    contenedorProductos.innerHTML = '<div class="mensaje-vacio proximamente"><img src="imagenes/proximo.jpg" alt="Próximamente" loading="lazy"></div>';
    return;
  }

  // Las primeras fotos (lo que se ve sin hacer scroll) se piden con prioridad alta.
  lista.forEach((product, indice) => {
    const card = crearCardProducto(product, indice < 10);
    contenedorProductos.appendChild(card);
  });
}

// Descarga en segundo plano la foto principal de todos los productos (cuando el navegador está libre),
// así al entrar a cualquier categoría las fotos ya están en caché y aparecen al instante.
const imagenesPrecalentadas = new Set();
function precalentarImagenes() {
  if (navigator.connection && navigator.connection.saveData) return;

  const pendientes = productos
    .map(p => p.image_url)
    .filter(url => url && !imagenesPrecalentadas.has(url));
  if (!pendientes.length) return;

  const esperar = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 3000 })
    : (fn) => setTimeout(fn, 300);

  const siguiente = () => {
    const lote = pendientes.splice(0, 3);
    if (!lote.length) return;
    lote.forEach(url => {
      imagenesPrecalentadas.add(url);
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    });
    setTimeout(() => esperar(siguiente), 250);
  };

  esperar(siguiente);
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
    const card = crearCardProducto(product, true);
    productosDestacados.appendChild(card);
  });
}

function crearCardProducto(product, prioridad) {
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
            <img decoding="async" fetchpriority="low" data-src="${variant.image_url}" alt="${variant.color}">
          </button>
        `).join('')}
      </div>
    `
    : '';

  card.innerHTML = `
    <img class="producto-imagen" ${prioridad ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" src="${imagen}" alt="${nombre}">
    ${variantesHtml}
    <div class="producto-info">
      <h2>${nombre}</h2>
      <p class="producto-precio">${dinero(precio)}</p>
    </div>
  `;

  const imagenProducto = card.querySelector('.producto-imagen');

  // Las miniaturas de color se descargan hasta que la foto principal termina,
  // para que las fotos grandes no compitan con ellas y la tarjeta aparezca primero.
  const cargarMiniaturas = () => {
    card.querySelectorAll('.variante-mini img[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  };
  if (imagenProducto.complete && imagenProducto.naturalWidth) {
    cargarMiniaturas();
  } else {
    imagenProducto.addEventListener('load', cargarMiniaturas, { once: true });
    imagenProducto.addEventListener('error', cargarMiniaturas, { once: true });
  }

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
    detallePrecio.textContent = dinero(precio);
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

  actualizarUrlProducto(false);

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// La URL del producto incluye el color y la talla elegidos, para poder compartirlos.
function rutaDeProducto() {
  if (!productoActual || !productoActual.slug) return null;

  const consulta = new URLSearchParams({ p: productoActual.slug });

  if (varianteActual && varianteActual.color) {
    consulta.set('color', slugTexto(varianteActual.color));
  }

  const tallaElegida = document.querySelector('.size-grid button.selected');
  if (tallaElegida && tallaElegida.textContent.trim()) {
    consulta.set('talla', tallaElegida.textContent.trim());
  }

  return '/producto?' + consulta.toString();
}

function actualizarUrlProducto(reemplazar) {
  const ruta = rutaDeProducto();
  if (ruta) actualizarRuta(ruta, reemplazar);
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
        <span>Color Unico</span>
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
      <small>${dinero(variant.precio)}</small>
    `;

    button.addEventListener('click', () => {
      document.querySelectorAll('.color-card').forEach(item => {
        item.classList.remove('selected');
      });

      button.classList.add('selected');
      varianteActual = variant;
      aplicarVariante(variant);
      actualizarUrlProducto(true);
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
    detallePrecio.textContent = dinero(variant.precio);
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
  actualizarRuta('/carrito');
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
  actualizarRuta('/checkout');

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

// Costo fijo de envío por pedido (el servidor lo vuelve a calcular; esto solo se muestra).
const COSTO_ENVIO = 210;
const ENVIO_GRATIS_DESDE = 5000;
let tipoEntrega = 'envio'; // 'envio' (a domicilio) o 'tienda' (recoger en la boutique)

function costoEnvioPara(subtotal) {
  if (tipoEntrega === 'tienda') return 0;
  if (!(subtotal > 0)) return 0;
  return subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
}

function renderizarResumenCheckout() {
  const lista = document.getElementById('checkout-resumen-lista');
  const totalEl = document.getElementById('checkout-total');
  if (!lista || !totalEl) return;

  let total = 0;

  lista.innerHTML = itemsCheckout.map(item => {
    const subtotal = Number(item.precio) * Number(item.cantidad);
    total += subtotal;

    const detalles = [
      item.color,
      item.talla ? 'Talla ' + item.talla : '',
      item.grip ? 'Grip ' + item.grip : ''
    ].filter(Boolean).join(' · ');

    return `
      <div class="checkout-item">
        <div class="checkout-item-foto">
          ${item.imagen ? `<img src="${item.imagen}" alt="${item.nombre}">` : ''}
          <span class="checkout-item-cant">${item.cantidad}</span>
        </div>
        <div class="checkout-item-info">
          <p class="checkout-item-nombre">${item.nombre}</p>
          <p class="checkout-item-detalle">${detalles}</p>
        </div>
        <strong>${dinero(subtotal)}</strong>
      </div>
    `;
  }).join('');

  const envio = itemsCheckout.length ? costoEnvioPara(total) : 0;
  const subEl = document.getElementById('checkout-subtotal');
  const envEl = document.getElementById('checkout-envio');
  const notaEnvio = document.getElementById('checkout-envio-nota');
  if (subEl) subEl.textContent = dinero(total);
  if (envEl) envEl.textContent = envio > 0 ? dinero(envio) : 'Gratis';

  if (notaEnvio) {
    if (tipoEntrega === 'tienda') {
      notaEnvio.textContent = 'Recoges en la boutique, sin costo de envío.';
    } else if (envio === 0 && total >= ENVIO_GRATIS_DESDE) {
      notaEnvio.textContent = '¡Tu compra tiene envío gratis!';
    } else if (total > 0) {
      notaEnvio.textContent = `Te faltan ${dinero(ENVIO_GRATIS_DESDE - total)} para envío gratis.`;
    } else {
      notaEnvio.textContent = '';
    }
  }

  totalEl.textContent = dinero(total + envio);
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
  const soloDatos = tipoEntrega === 'tienda';

  Object.entries(campos).forEach(([clave, input]) => {
    // Al recoger en tienda solo se piden nombre y teléfono; la dirección se manda vacía.
    const aplica = !soloDatos || clave === 'nombre' || clave === 'telefono';
    const valor = input && aplica ? input.value.trim() : '';
    direccion[clave] = valor;

    if (input && aplica && input.required && !valor && !faltante) {
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
    if (mensaje) mensaje.textContent = (tipoEntrega === 'tienda' ? 'Completa tu nombre y teléfono antes de pagar.' : 'Completa tu dirección de entrega antes de pagar.');
    return;
  }

  if (mensaje) mensaje.textContent = '';

  const campoGuardar = document.getElementById('checkout-guardar-direccion');
  if (tipoEntrega === 'envio' && campoGuardar && campoGuardar.checked) {
    await guardarDireccionDesdeCheckout();
  }

  await iniciarPago(itemsCheckout, metodo, direccion);
}

const SECCIONES_CUENTA = ['informacion', 'pedidos', 'direcciones', 'tarjetas'];

function mostrarCuenta(seccion) {
  if (!window.usuarioActual) return;

  if (vistaInicio) vistaInicio.classList.add('oculto');
  if (vistaColeccion) vistaColeccion.classList.add('oculto');
  if (vistaProducto) vistaProducto.classList.add('oculto');
  if (vistaCarrito) vistaCarrito.classList.add('oculto');
  if (vistaCheckout) vistaCheckout.classList.add('oculto');
  if (vistaCuenta) vistaCuenta.classList.remove('oculto');

  renderizarInformacionCuenta();
  renderizarDirecciones();

  // Si la sección no existe (o está desactivada), se abre la información de cuenta.
  const nombre = typeof seccion === 'string' && SECCIONES_CUENTA.includes(seccion) &&
    document.getElementById(`cuenta-panel-${seccion}`)
    ? seccion
    : 'informacion';

  activarSeccionCuenta(nombre);

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function activarSeccionCuenta(nombre) {
  document.querySelectorAll('.cuenta-tab').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === nombre);
  });

  document.querySelectorAll('.cuenta-panel').forEach(panel => panel.classList.add('oculto'));

  const panel = document.getElementById(`cuenta-panel-${nombre}`);
  if (panel) panel.classList.remove('oculto');

  if (nombre === 'tarjetas') {
    montarCamposTarjetaCuenta();
    renderizarTarjetasGuardadas();
  }

  if (nombre === 'pedidos') {
    renderizarPedidos();
  }

  actualizarRuta('/cuenta?seccion=' + nombre);
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

function armarBloqueReembolso(pedido) {
  if (pedido.cancelada) return '';

  if (pedido.devolucion) {
    const estado = pedido.estatusDevolucion || 'Devolución solicitada';
    return `
      <div class="pedido-devolucion">
        <p class="pedido-devolucion-estatus">${estado}</p>
        ${pedido.razonDevolucion ? `<p class="pedido-devolucion-razon">Motivo: ${pedido.razonDevolucion}</p>` : ''}
      </div>
    `;
  }

  return `
    <div class="pedido-devolucion">
      <button type="button" class="btn-reembolso" data-reembolso-id="${pedido.idEnvio}">Reembolso</button>
    </div>
  `;
}

/* SOLICITAR REEMBOLSO */

let pedidoReembolsoActual = null;

function abrirReembolso(idEnvio) {
  pedidoReembolsoActual = idEnvio;
  document.getElementById('reembolso-pedido-id').textContent = idEnvio;
  document.getElementById('reembolso-paso-confirmar').classList.remove('oculto');
  document.getElementById('reembolso-paso-razon').classList.add('oculto');
  document.getElementById('reembolso-error').classList.add('oculto');
  document.getElementById('reembolso-modal').classList.remove('oculto');
}

function cerrarReembolso() {
  pedidoReembolsoActual = null;
  const modal = document.getElementById('reembolso-modal');
  if (modal) modal.classList.add('oculto');
}

async function enviarReembolso(razon, botones) {
  const error = document.getElementById('reembolso-error');
  error.classList.add('oculto');
  botones.forEach(b => { b.disabled = true; });

  try {
    const idToken = await window.obtenerTokenSesion();

    const respuesta = await fetch(obtenerBaseApi() + '/api/pedidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ idEnvio: pedidoReembolsoActual, razon })
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(datos.error || 'No se pudo registrar tu solicitud.');
    }

    cerrarReembolso();
    renderizarPedidos();
  } catch (e) {
    error.textContent = e.message;
    error.classList.remove('oculto');
    botones.forEach(b => { b.disabled = false; });
  }
}

(function configurarReembolso() {
  const iniciar = () => {
    const modal = document.getElementById('reembolso-modal');
    if (!modal) return;

    document.getElementById('cerrar-reembolso').addEventListener('click', cerrarReembolso);
    document.getElementById('reembolso-no').addEventListener('click', cerrarReembolso);
    modal.addEventListener('click', e => { if (e.target === modal) cerrarReembolso(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarReembolso(); });

    document.getElementById('reembolso-si').addEventListener('click', () => {
      document.getElementById('reembolso-paso-confirmar').classList.add('oculto');
      document.getElementById('reembolso-paso-razon').classList.remove('oculto');
    });

    const botonesRazon = [...modal.querySelectorAll('.reembolso-razon')];
    botonesRazon.forEach(boton => {
      boton.addEventListener('click', () => enviarReembolso(boton.dataset.razon, botonesRazon));
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();

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
          ${pedido.fecha ? `<p class="pedido-fecha">${pedido.fecha}</p>` : ''}
        </div>

        ${pedido.cancelada ? '<p class="pedido-cancelado">Compra cancelada</p>' : armarBarraEstatus(pedido.estatus)}

        <div class="pedido-productos">
          ${pedido.productos.map(producto => `
            <p>${producto.nombre}${producto.talla ? ' - Talla ' + producto.talla : ''}${producto.color ? ' - ' + producto.color : ''}${producto.grip ? ' - ' + producto.grip : ''} × ${producto.cantidad}</p>
          `).join('')}
        </div>

        <p class="pedido-direccion">
          Entrega: ${pedido.direccion.calle} ${pedido.direccion.numero}, ${pedido.direccion.colonia}, ${pedido.direccion.ciudad}, ${pedido.direccion.estado}, CP ${pedido.direccion.cp}
        </p>

        ${armarBloqueReembolso(pedido)}
      </div>
    `).join('');

    contenedor.querySelectorAll('[data-reembolso-id]').forEach(boton => {
      boton.addEventListener('click', () => abrirReembolso(boton.dataset.reembolsoId));
    });
  } catch (error) {
    console.error('No se pudieron cargar los pedidos:', error);
    contenedor.className = 'cuenta-vacio';
    contenedor.innerHTML = '<p>No se pudieron cargar tus pedidos. Intenta de nuevo más tarde.</p>';
  }
}

/* AVISOS (reemplazan a alert): misma ventana que los términos de servicio */
function mostrarAviso(titulo, texto, alCerrar) {
  const previo = document.getElementById('aviso-modal');
  if (previo) previo.remove();

  const modal = document.createElement('div');
  modal.id = 'aviso-modal';
  modal.className = 'politica-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="politica-box aviso-box">
      <button class="cerrar-politica" type="button" aria-label="Cerrar">&times;</button>
      <h2></h2>
      <p></p>
      <button class="aviso-aceptar" type="button">Entendido</button>
    </div>
  `;
  modal.querySelector('h2').textContent = titulo;
  modal.querySelector('p').textContent = texto;

  const cerrar = () => {
    document.removeEventListener('keydown', alTeclear);
    modal.remove();
    if (typeof alCerrar === 'function') alCerrar();
  };
  const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };

  modal.querySelector('.cerrar-politica').addEventListener('click', cerrar);
  modal.querySelector('.aviso-aceptar').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
  document.addEventListener('keydown', alTeclear);

  document.body.appendChild(modal);
  modal.querySelector('.aviso-aceptar').focus();
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
    mostrarAviso('Pago no completado', 'No se completó el pago con Clip. No se hizo ningún cobro. Puedes intentar de nuevo.');
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

      mostrarAviso('¡Gracias por tu compra!', 'Tu pedido ya quedó registrado y lo puedes ver en "Mi cuenta → Pedidos".');
      return;
    }

    console.warn('Respuesta de confirmar-link-clip:', respuesta.status, datos);

    if (datos && datos.detalle) {
      mostrarAviso('Pedido pendiente', 'Tu pago se cobró, pero no pudimos registrar el pedido: ' + datos.detalle);
      return;
    }

    mostrarAviso('Pago en revisión', 'Tu pago todavía no se confirma. Si elegiste pagar en efectivo, tu pedido se registrará solo en cuanto recibamos el pago. Si ya pagaste con tarjeta, revisa "Mi cuenta → Pedidos" en unos minutos.');
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
      mostrarAviso('¡Gracias por tu compra!', 'Tu pedido ya quedó registrado y lo puedes ver en "Mi cuenta → Pedidos".');
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
  const productos = itemsCheckout.reduce(
    (suma, item) => suma + Number(item.precio) * Number(item.cantidad),
    0
  );

  return productos + (itemsCheckout.length ? costoEnvioPara(productos) : 0);
}

function actualizarBotonClip() {
  const boton = document.getElementById('btn-confirmar-pago-clip');
  if (!boton) return;

  boton.textContent = `Pagar ${dinero(totalCheckout())}`;
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

  mostrarAviso('¡Gracias por tu compra!', 'Tu pedido ya quedó registrado y lo puedes ver en "Mi cuenta → Pedidos".', () => {
    window.location.href = window.location.origin + window.location.pathname;
  });
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
    if (mensaje) mensaje.textContent = (tipoEntrega === 'tienda' ? 'Completa tu nombre y teléfono antes de pagar.' : 'Completa tu dirección de entrega antes de pagar.');
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
    if (tipoEntrega === 'envio' && campoGuardar && campoGuardar.checked) {
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
    if (mensaje) mensaje.textContent = (tipoEntrega === 'tienda' ? 'Completa tu nombre y teléfono antes de pagar.' : 'Completa tu dirección de entrega antes de pagar.');
    return;
  }

  if (boton) boton.disabled = true;
  if (mensaje) mensaje.textContent = '';

  const campoGuardar = document.getElementById('checkout-guardar-direccion');
  if (tipoEntrega === 'envio' && campoGuardar && campoGuardar.checked) {
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
    tab.addEventListener('click', () => activarSeccionCuenta(tab.dataset.tab));
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

  document.addEventListener('abrir-mi-cuenta', () => mostrarCuenta());

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
    mostrarAviso('No se pudo guardar', 'No se pudo guardar la dirección. Intenta de nuevo.');
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

function dinero(valor) {
  return '$' + Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderizarCarrito() {
  if (!carritoContenido || !carritoTotal) return;

  const subC = document.getElementById('carrito-subtotal');
  const envC = document.getElementById('carrito-envio');
  const resumen = document.getElementById('carrito-resumen');

  carritoContenido.innerHTML = '';

  if (carrito.length === 0) {
    carritoContenido.innerHTML = `
      <div class="carrito-vacio">
        <p class="carrito-vacio-titulo">Tu carrito está vacío</p>
        <p>Cuando agregues productos, aparecerán aquí.</p>
        <button type="button" class="carrito-seguir carrito-vacio-boton" id="btn-carrito-vacio-inicio">Ir a la tienda</button>
      </div>
    `;

    const irInicio = document.getElementById('btn-carrito-vacio-inicio');
    if (irInicio) irInicio.addEventListener('click', () => mostrarInicio());

    if (resumen) resumen.classList.add('oculto');
    carritoTotal.textContent = dinero(0);
    if (subC) subC.textContent = dinero(0);
    if (envC) envC.textContent = dinero(0);
    return;
  }

  if (resumen) resumen.classList.remove('oculto');

  let total = 0;

  carrito.forEach((item, indice) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const detalles = [
      item.color || 'Color único',
      item.talla ? 'Talla ' + item.talla : '',
      item.grip ? 'Grip ' + item.grip : ''
    ].filter(Boolean).join(' · ');

    const tarjeta = document.createElement('article');
    tarjeta.classList.add('carrito-item');

    tarjeta.innerHTML = `
      <img class="carrito-item-img" src="${item.imagen}" alt="${item.nombre}">

      <div class="carrito-item-info">
        <h3>${item.nombre}</h3>
        <p class="carrito-item-detalle">${detalles}</p>
        <p class="carrito-item-precio">${dinero(item.precio)} c/u</p>

        <div class="carrito-cantidad" aria-label="Cantidad">
          <button type="button" class="carrito-cantidad-btn" data-accion="menos" data-indice="${indice}" aria-label="Quitar una pieza"${item.cantidad <= 1 ? ' disabled' : ''}>−</button>
          <span>${item.cantidad}</span>
          <button type="button" class="carrito-cantidad-btn" data-accion="mas" data-indice="${indice}" aria-label="Agregar una pieza">+</button>
        </div>
      </div>

      <div class="carrito-item-lado">
        <strong class="carrito-item-subtotal">${dinero(subtotal)}</strong>
        <button type="button" class="carrito-quitar" data-accion="quitar" data-indice="${indice}">Eliminar</button>
      </div>
    `;

    carritoContenido.appendChild(tarjeta);
  });

  if (subC) subC.textContent = dinero(total);
  // El envío se elige y se calcula en el checkout (a domicilio o recoger en tienda).
  if (envC) envC.textContent = 'Se calcula al pagar';

  carritoTotal.textContent = dinero(total);

  carritoContenido.querySelectorAll('[data-accion]').forEach(boton => {
    boton.addEventListener('click', () => {
      const indice = Number(boton.dataset.indice);
      const item = carrito[indice];
      if (!item) return;

      if (boton.dataset.accion === 'mas') {
        item.cantidad = Math.min(Number(item.cantidad) + 1, 20);
      } else if (boton.dataset.accion === 'menos') {
        item.cantidad = Math.max(Number(item.cantidad) - 1, 1);
      } else {
        carrito.splice(indice, 1);
      }

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
      actualizarUrlProducto(true);
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
// La imagen solo se usa para mostrar el resumen; no es enumerable, así que no se envía al servidor.
function conImagen(item, src) {
  Object.defineProperty(item, 'imagen', { value: src || '', enumerable: false, writable: true });
  return item;
}

function armarProductoParaPagar() {
  const tallaSeleccionada = document.querySelector('.size-grid button.selected');
  const gripSeleccionadoBoton = document.querySelector('.grip-grid button.selected');

  return conImagen({
    nombre: productoActual.name || productoActual.nombre || 'Producto',
    precio: varianteActual
      ? Number(varianteActual.precio || varianteActual.price)
      : Number(productoActual.price || productoActual.precio),
    cantidad: Math.max(1, Number(cantidadProducto) || 1),
    talla: tallaSeleccionada ? tallaSeleccionada.textContent.trim() : '',
    grip: gripSeleccionadoBoton ? gripSeleccionadoBoton.textContent.trim() : '',
    color: varianteActual ? varianteActual.color : 'Único'
  }, (document.getElementById('detalle-imagen') || {}).src);
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

    const itemsCarrito = carrito.map(item => conImagen({
      nombre: item.nombre,
      precio: Number(item.precio),
      cantidad: item.cantidad,
      talla: item.talla && item.talla !== 'Sin talla' ? item.talla : '',
      color: item.color,
      grip: item.grip || ''
    }, item.imagen));

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
    if (mensaje) mensaje.textContent = (tipoEntrega === 'tienda' ? 'Completa tu nombre y teléfono antes de pagar.' : 'Completa tu dirección de entrega antes de pagar.');
    return;
  }

  if (mensaje) mensaje.textContent = '';

  const textoOriginal = boton ? boton.innerHTML : '';

  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Abriendo Clip...';
  }

  try {
    const campoGuardar = document.getElementById('checkout-guardar-direccion');
    if (tipoEntrega === 'envio' && campoGuardar && campoGuardar.checked) {
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
        tipoEntrega,
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
      boton.innerHTML = textoOriginal;
    }
  }
}

if (btnPagarClip) {
  btnPagarClip.addEventListener('click', pagarConClip);
}

// Si el cliente regresa con la flecha "atrás" desde Clip o PayPal, el navegador puede devolver la
// página tal como se quedó (con el botón en "Abriendo Clip..." y bloqueado). Aquí se restaura.
const contenidoOriginalBtnClip = btnPagarClip ? btnPagarClip.innerHTML : '';

function restaurarBotonesDePago() {
  if (btnPagarClip) {
    btnPagarClip.disabled = false;
    btnPagarClip.innerHTML = contenidoOriginalBtnClip;
  }

  if (btnPagarPaypal) btnPagarPaypal.disabled = false;

  const btnStripe = document.getElementById('btn-tarjeta-stripe');
  if (btnStripe) btnStripe.disabled = false;
}

window.addEventListener('pageshow', evento => {
  if (evento.persisted) restaurarBotonesDePago();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') restaurarBotonesDePago();
});

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

// Colores de un producto (de todas sus variantes), normalizados para comparar.
function claveColor(color) {
  return String(color || '').trim().toLowerCase();
}

function esColorUnico(color) {
  return ['', 'color unico', 'color único', 'unico', 'único', 'sin color'].includes(claveColor(color));
}

function coloresDeProducto(producto) {
  return (producto.variantes || [])
    .map(variante => claveColor(variante.color))
    .filter(color => color && !esColorUnico(color));
}

function obtenerSubcategoria(producto) {
  return producto.subcategoria || producto['subcategorÃ­a'] || '';
}

function resetearFiltros() {
  filtrosActivos = {
    subcategorias: [],
    colores: [],
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

  // Lista de colores disponibles en esta colección (sin repetir, con su nombre tal como viene en el catálogo).
  const nombresColor = new Map();
  lista.forEach(producto => {
    (producto.variantes || []).forEach(variante => {
      const clave = claveColor(variante.color);
      if (clave && !esColorUnico(clave) && !nombresColor.has(clave)) {
        nombresColor.set(clave, String(variante.color).trim());
      }
    });
  });
  const colores = [...nombresColor.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));

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

    ${colores.length ? `
    <div class="filtro-grupo">
      <h4>Color</h4>
      <div class="filtro-colores">
        ${colores.map(([clave, nombre]) => `
          <label class="filtro-color">
            <input type="checkbox" value="${clave}" class="filtro-color-input"${filtrosActivos.colores.includes(clave) ? ' checked' : ''}>
            <span>${nombre}</span>
          </label>
        `).join('')}
      </div>
    </div>` : ''}

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

  const btnCerrar = panel.querySelector('.cerrar-filtros');
  if (btnCerrar) btnCerrar.addEventListener('click', cerrarFiltros);

  panel.querySelectorAll('.filtro-subcategoria').forEach(input => {
    input.addEventListener('change', actualizarVistaConFiltros);
  });

  panel.querySelectorAll('.filtro-color-input').forEach(input => {
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

    filtrosActivos.colores = [...panel.querySelectorAll('.filtro-color-input:checked')]
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

  if (filtrosActivos.colores.length > 0) {
    resultado = resultado.filter(producto =>
      coloresDeProducto(producto).some(color => filtrosActivos.colores.includes(color))
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
  mostrarProductos(aplicarFiltrosColeccion(), true);
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

  // Cada palabra escrita debe aparecer en el producto (nombre, categoría, colores, etc.),
  // así "negro" encuentra todo lo que tenga ese color y "chamarra negro" lo afina.
  const palabras = texto.split(' ').filter(Boolean);

  return productos.filter(producto => {
    const colores = (producto.variantes || []).map(variante => variante.color);

    const contenido = [
      producto.nombre,
      producto.name,
      producto.categoria,
      producto.subcategoria,
      producto.descripcion,
      producto.description,
      producto.slug,
      producto.color,
      ...colores
    ].map(normalizarBusqueda).join(' ');

    return palabras.every(palabra => contenido.includes(palabra));
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
  actualizarRuta('/buscar?q=' + encodeURIComponent(termino));
  productosColeccionActual = resultados;
  coleccionSocksBase = null;
  actualizarSelectorEdad();
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
  mostrarProductos(productosColeccionActual, true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const URL_BACKEND_VERCEL = 'https://www.inequestrian.com.mx';

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
        tipoEntrega,
        urlRetorno: window.location.origin + window.location.pathname
      })
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(data.message || data.error || 'No se pudo iniciar el pago');
    }

    window.location.href = data.init_point;
  } catch (error) {
    mostrarAviso('No se pudo iniciar el pago', error.message);
  }
}

/* POLÍTICAS (ventana desde el pie de página) */
(function configurarPoliticas() {
  const POLITICAS = {
    'link-reembolso': {
      titulo: 'Política De Rembolso',
      texto: 'En caso de devoluciones o reembolsos, cuentan con 30 días posteriores a la entrega. Se requiere que no se quiten las etiquetas de la prenda y que esté sin usar en perfectas condiciones. El envío de la prenda reembolsada correrá por parte del cliente; es importante notar que las tallas vienen reducidas, por lo que recomendamos pedir una talla arriba de la que normalmente usan.'
    },
    'link-privacidad': {
      titulo: 'Política De Privacidad',
      texto: "InEquestrian Shop gestiona esta tienda y este sitio web, incluidos los datos, el contenido, las funciones, las herramientas, los productos y los servicios para ofrecerle a usted, el cliente, una experiencia de compra seleccionada (los “Servicios”). Esta Política de privacidad describe cómo recopilamos, utilizamos y divulgamos su información personal cuando visita, utiliza o realiza una compra u otra transacción a través de los Servicios o cuando se comunica con nosotros por cualquier otro medio. En caso de conflicto entre nuestros Términos del Servicio y esta Política de privacidad, prevalecerá esta Política de privacidad en lo que respecta a la recopilación, el tratamiento y la divulgación de su información personal.\n\nLe rogamos que lea atentamente esta Política de privacidad. Al utilizar y acceder a cualquiera de los Servicios, usted reconoce haber leído esta Política de privacidad y entender la forma en que se recopila, utiliza y divulga su información personal, de conformidad con lo establecido en la presente Política de privacidad.\n\nSi tiene alguna reclamación sobre cómo tratamos su información personal, le rogamos que se ponga en contacto con nosotros a través de los detalles de contacto que se indican más abajo. Según el lugar en el que resida, es posible que tenga derecho a recurrir nuestra decisión poniéndose en contacto con nosotros a través de los detalles de contacto que se indican más abajo, o a presentar una reclamación ante la autoridad local de protección de datos."
    },
    'link-terminos': {
      titulo: 'Términos De Servicio',
      texto: 'Al realizar tu compra entiendes que el tiempo de entrega puede variar con base en la disponibilidad del producto; serás notificado a la brevedad acerca de esto.'
    },
    'link-envio': {
      titulo: 'Política De Envio',
      texto: 'Al realizar tu pedido previamente revisaremos la disponibilidad de los productos; si está disponible en la boutique recibirás tu pedido en 3 días hábiles, en caso de no contar con tus productos en la boutique se pedirán de España y el tiempo de envío y entrega será de 10-15 días hábiles.'
    }
  };

  const iniciar = () => {
    const modal = document.getElementById('politica-modal');
    const titulo = document.getElementById('politica-titulo');
    const texto = document.getElementById('politica-texto');
    const cerrar = document.getElementById('cerrar-politica');
    if (!modal || !titulo || !texto) return;

    const cerrarModal = () => modal.classList.add('oculto');

    Object.keys(POLITICAS).forEach((id) => {
      const link = document.getElementById(id);
      if (!link) return;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        titulo.textContent = POLITICAS[id].titulo;
        texto.textContent = POLITICAS[id].texto;
        modal.classList.remove('oculto');
      });
    });

    if (cerrar) cerrar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();

/* REINTENTO AUTOMÁTICO DE IMÁGENES
   Si una imagen falla al cargar (red lenta, servidor saturado), se vuelve a intentar
   hasta 3 veces antes de mostrar la imagen de respaldo. */
(function configurarReintentoImagenes() {
  const MAX_REINTENTOS = 3;
  const RESPALDO = 'imagenes/productos/placeholder.jpg';

  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;

    const original = img.dataset.srcOriginal || img.getAttribute('src');
    if (!original || original === RESPALDO || original.startsWith('data:')) return;
    img.dataset.srcOriginal = original;

    const intentos = Number(img.dataset.reintentos || 0);

    if (intentos >= MAX_REINTENTOS) {
      img.dataset.reintentos = 'fin';
      img.src = RESPALDO;
      return;
    }
    if (img.dataset.reintentos === 'fin') return;

    img.dataset.reintentos = String(intentos + 1);
    setTimeout(() => {
      const separador = original.includes('?') ? '&' : '?';
      img.src = `${original}${separador}r=${Date.now()}`;
    }, 600 * (intentos + 1));
  }, true);
})();

/* BARRA DE ANUNCIOS: cambia sola entre sus mensajes cada pocos segundos */
(function iniciarBarraAnuncios() {
  const INTERVALO = 4000;

  const iniciar = () => {
    const barra = document.getElementById('barra-anuncios');
    if (!barra) return;

    const anuncios = [...barra.querySelectorAll('.anuncio')];
    if (anuncios.length < 2) return;

    let actual = 0;
    let temporizador = null;

    const siguiente = () => {
      anuncios[actual].classList.remove('activo');
      actual = (actual + 1) % anuncios.length;
      anuncios[actual].classList.add('activo');
    };

    const arrancar = () => {
      if (!temporizador) temporizador = setInterval(siguiente, INTERVALO);
    };
    const detener = () => {
      clearInterval(temporizador);
      temporizador = null;
    };

    // No gasta recursos cuando la pestaña no se está viendo.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) detener(); else arrancar();
    });

    arrancar();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();


/* PAGO CON TARJETA DENTRO DE LA PÁGINA (Stripe) */

let stripeInstancia = null;
let stripeElementos = null;
let stripeIntentId = null;
let stripeTotal = 0;

function cargarStripeJs() {
  if (window.Stripe) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar Stripe. Revisa tu conexión.'));
    document.head.appendChild(script);
  });
}

function cerrarPanelStripe() {
  const panel = document.getElementById('panel-stripe');
  const abrir = document.getElementById('btn-tarjeta-stripe');

  if (panel) panel.classList.add('oculto');
  if (abrir) abrir.classList.remove('oculto');

  if (stripeElementos) {
    try {
      const elemento = stripeElementos.getElement('payment');
      if (elemento) elemento.destroy();
    } catch (error) { /* ya estaba cerrado */ }
  }

  stripeElementos = null;
  stripeIntentId = null;
}

async function abrirTarjetaStripe() {
  const mensaje = document.getElementById('checkout-mensaje');
  const boton = document.getElementById('btn-tarjeta-stripe');

  if (!itemsCheckout.length) return;

  if (!window.usuarioActual) {
    pedirInicioSesion('Inicia sesión para pagar con tarjeta.');
    return;
  }

  const direccion = obtenerDireccionCheckout();

  if (!direccion) {
    if (mensaje) mensaje.textContent = (tipoEntrega === 'tienda' ? 'Completa tu nombre y teléfono antes de pagar.' : 'Completa tu dirección de entrega antes de pagar.');
    return;
  }

  if (mensaje) mensaje.textContent = '';

  const textoOriginal = boton.innerHTML;
  boton.disabled = true;
  boton.textContent = 'Preparando pago seguro...';

  try {
    const campoGuardar = document.getElementById('checkout-guardar-direccion');
    if (tipoEntrega === 'envio' && campoGuardar && campoGuardar.checked) {
      await guardarDireccionDesdeCheckout();
    }

    await cargarStripeJs();

    const idToken = await window.obtenerTokenSesion();

    const respuesta = await fetch(obtenerBaseApi() + '/api/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ accion: 'crear', productos: itemsCheckout, direccion, tipoEntrega })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.ok) {
      throw new Error(datos.message || datos.error || 'No se pudo iniciar el pago con tarjeta.');
    }

    stripeInstancia = window.Stripe(datos.publishableKey);
    stripeIntentId = datos.paymentIntentId;
    stripeTotal = Number(datos.total);

    stripeElementos = stripeInstancia.elements({
      clientSecret: datos.clientSecret,
      locale: 'es',
      appearance: {
        theme: 'flat',
        variables: {
          fontFamily: '"Times New Roman", Times, serif',
          colorPrimary: '#1f1f1f',
          colorBackground: '#f6f4f1',
          colorText: '#1f1f1f',
          colorDanger: '#a33a3a',
          borderRadius: '0px',
          spacingUnit: '4px'
        },
        rules: {
          '.Input': { border: '1px solid #ddd6ca', padding: '14px' },
          '.Input:focus': { border: '1px solid #1f1f1f', boxShadow: 'none' },
          '.Label': { color: '#6b5d52' }
        }
      }
    });

    stripeElementos.create('payment', { layout: 'tabs' }).mount('#stripe-element');

    const botonPagar = document.getElementById('btn-confirmar-stripe');
    botonPagar.textContent = 'Pagar ' + dinero(stripeTotal);
    botonPagar.disabled = false;

    document.getElementById('panel-stripe').classList.remove('oculto');
    boton.classList.add('oculto');
    document.getElementById('panel-stripe').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    console.error('No se pudo abrir el pago con tarjeta:', error);
    if (mensaje) mensaje.textContent = error.message || 'No se pudo iniciar el pago con tarjeta.';
  } finally {
    boton.disabled = false;
    boton.innerHTML = textoOriginal;
  }
}

async function confirmarCobroStripeEnServidor(paymentIntentId) {
  const respuesta = await fetch(obtenerBaseApi() + '/api/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'confirmar', paymentIntentId })
  });

  return { respuesta, datos: await respuesta.json() };
}

async function pagarConStripe() {
  const mensaje = document.getElementById('checkout-mensaje');
  const boton = document.getElementById('btn-confirmar-stripe');

  if (!stripeInstancia || !stripeElementos) return;

  if (mensaje) mensaje.textContent = '';

  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Procesando pago...';

  try {
    const resultado = await stripeInstancia.confirmPayment({
      elements: stripeElementos,
      confirmParams: {
        return_url: window.location.origin + window.location.pathname + '?pago=stripe'
      },
      redirect: 'if_required'
    });

    if (resultado.error) {
      throw new Error(resultado.error.message || 'No se pudo procesar la tarjeta.');
    }

    const intento = resultado.paymentIntent;

    if (intento && intento.status === 'succeeded') {
      const { respuesta, datos } = await confirmarCobroStripeEnServidor(intento.id);

      if (respuesta.ok && datos.ok) {
        pagoClipExitoso();
        return;
      }

      // El cobro sí se hizo; el aviso automático de Stripe terminará de registrar el pedido.
      mostrarAviso('Pago recibido', 'Tu pago se realizó correctamente. Tu pedido aparecerá en "Mi cuenta → Pedidos" en unos minutos.');
      return;
    }

    throw new Error('El pago no se completó. No se hizo ningún cobro.');
  } catch (error) {
    console.error('No se pudo pagar con tarjeta:', error);
    if (mensaje) mensaje.textContent = error.message || 'No se pudo procesar el pago.';
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

// Cuando el banco pide verificación extra (3D Secure) el cliente sale de la página y regresa aquí.
async function confirmarStripeSiAplica() {
  const parametros = new URLSearchParams(window.location.search);

  if (parametros.get('pago') !== 'stripe') return;

  const intentId = parametros.get('payment_intent');
  const estado = parametros.get('redirect_status');

  window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);

  if (!intentId) return;

  if (estado && estado !== 'succeeded') {
    mostrarAviso('Pago no completado', 'No se completó el pago con tarjeta. No se hizo ningún cobro. Puedes intentar de nuevo.');
    return;
  }

  try {
    const { respuesta, datos } = await confirmarCobroStripeEnServidor(intentId);

    if (respuesta.ok && datos.ok) {
      carrito = [];
      guardarCarrito();
      actualizarContadorCarrito();
      mostrarAviso('¡Gracias por tu compra!', 'Tu pedido ya quedó registrado y lo puedes ver en "Mi cuenta → Pedidos".');
      return;
    }

    mostrarAviso('Pago en revisión', 'Tu pago todavía no se confirma. Revisa "Mi cuenta → Pedidos" en unos minutos.');
  } catch (error) {
    console.error('No se pudo confirmar el pago con tarjeta:', error);
  }
}

(function configurarStripe() {
  const abrir = document.getElementById('btn-tarjeta-stripe');
  const pagar = document.getElementById('btn-confirmar-stripe');
  const cancelar = document.getElementById('btn-cancelar-stripe');

  if (abrir) abrir.addEventListener('click', abrirTarjetaStripe);
  if (pagar) pagar.addEventListener('click', pagarConStripe);
  if (cancelar) cancelar.addEventListener('click', cerrarPanelStripe);
})();


/* TIPO DE ENTREGA (envío a domicilio / recoger en tienda) */

const camposRequeridosSoloEnvio = ['checkout-cp', 'checkout-calle', 'checkout-ciudad', 'checkout-estado'];

function aplicarTipoEntrega(tipo) {
  tipoEntrega = tipo === 'tienda' ? 'tienda' : 'envio';

  const contenedor = document.querySelector('.checkout-direccion');
  if (contenedor) contenedor.classList.toggle('entrega-tienda', tipoEntrega === 'tienda');

  camposRequeridosSoloEnvio.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.required = tipoEntrega === 'envio';
  });

  const mensaje = document.getElementById('checkout-mensaje');
  if (mensaje) mensaje.textContent = '';

  renderizarResumenCheckout();
}

document.querySelectorAll('input[name="tipo-entrega"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.checked) aplicarTipoEntrega(radio.value);
  });
});