const admin = require('firebase-admin');

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
  if (admin.apps.length) {
    return admin.app();
  }

  const credencialTexto = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!credencialTexto) {
    throw new Error(
      'Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT con la cuenta de servicio de Firebase.'
    );
  }

  const credencial = JSON.parse(credencialTexto);

  return admin.initializeApp({
    credential: admin.credential.cert(credencial)
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
    const datos = await admin.auth(app).verifyIdToken(idToken);
    return { uid: datos.uid, email: datos.email || '', nombre: datos.name || '' };
  } catch (error) {
    const errorAuth = new Error('Tu sesión no es válida o ya expiró.');
    errorAuth.status = 401;
    throw errorAuth;
  }
}

function obtenerFirestoreAdmin() {
  const app = obtenerAppFirebaseAdmin();
  return admin.firestore(app);
}

module.exports = { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin };