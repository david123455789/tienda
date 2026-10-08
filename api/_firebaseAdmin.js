const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

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
  return getFirestore(app);
}

module.exports = { obtenerUsuarioDesdeToken, obtenerFirestoreAdmin };