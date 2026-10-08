// Se cargan al usarse (no al iniciar) para que, si algo falla, el error llegue como mensaje claro.
function cargarFirebaseAdmin() {
  try {
    return {
      ...require('firebase-admin/app'),
      getAuth: require('firebase-admin/auth').getAuth,
      getFirestore: require('firebase-admin/firestore').getFirestore
    };
  } catch (errorModular) {
    try {
      const admin = require('firebase-admin');

      if (!admin || !admin.credential) {
        let version = 'desconocida';
        try { version = require('firebase-admin/package.json').version; } catch (e) {}
        throw new Error(
          'firebase-admin no cargó bien (versión ' + version + '). Error al cargar: ' + errorModular.message
        );
      }
      return {
        initializeApp: (opciones) => admin.initializeApp(opciones),
        cert: (c) => admin.credential.cert(c),
        getApps: () => admin.apps || [],
        getApp: () => admin.app(),
        getAuth: (app) => admin.auth(app),
        getFirestore: (app) => admin.firestore(app)
      };
    } catch (errorClasico) {
      throw new Error(
        'No se pudo cargar firebase-admin en el servidor: ' + errorModular.message +
        ' — Revisa que "firebase-admin" esté en dependencies de tu package.json.'
      );
    }
  }
}

/*
 * Este archivo confirma, del lado del servidor, quién es realmente el usuario
 * que está haciendo la petición (usando su token de Firebase), para que nadie
 * pueda leer, agregar o borrar tarjetas de otra persona con solo cambiar un uid
 * en la petición.
 *
 * Necesita la variable de entorno FIREBASE_SERVICE_ACCOUNT con el JSON de la
 * cuenta de servicio de Firebase, en una sola línea. Instrucciones abajo.
 */

function obtenerAppFirebaseAdmin() {
  const { initializeApp, cert, getApps, getApp } = cargarFirebaseAdmin();

  if (getApps().length) {
    return getApp();
  }

  const credencialTexto = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!credencialTexto) {
    throw new Error(
      'Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT con la cuenta de servicio de Firebase.'
    );
  }

  let credencial;

  try {
    credencial = JSON.parse(credencialTexto.trim());
  } catch (error) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT no es un JSON válido. Pega completo el archivo que descargas en Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.'
    );
  }

  if (!credencial.private_key || !credencial.client_email || !credencial.project_id) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT está incompleto: le falta private_key, client_email o project_id. Debe ser el JSON de "Cuentas de servicio", no la configuración web de Firebase.'
    );
  }

  credencial.private_key = String(credencial.private_key).replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert(credencial)
  });
}

async function obtenerUsuarioDesdeToken(req) {
  const encabezado = req.headers.authorization || '';
  const idToken = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;

  if (!idToken) {
    const error = new Error('Falta iniciar sesión.');
    error.status = 401;
    throw error;
  }

  const app = obtenerAppFirebaseAdmin();

  try {
    const { getAuth } = cargarFirebaseAdmin();
    const datos = await getAuth(app).verifyIdToken(idToken);
    return { uid: datos.uid, email: datos.email || '', nombre: datos.name || '' };
  } catch (error) {
    const errorAuth = new Error('Tu sesión no es válida o ya expiró.');
    errorAuth.status = 401;
    throw errorAuth;
  }
}

function obtenerFirestoreAdmin() {
  const app = obtenerAppFirebaseAdmin();
  const { getFirestore } = cargarFirebaseAdmin();
  return getFirestore(app);
}

module.exports = { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin };