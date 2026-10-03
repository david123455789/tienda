import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBANyNBW_Pkn1vwYJeaiWZ6g2_-NW6HYHo",
  authDomain: "usuarios-tienda-da566.firebaseapp.com",
  projectId: "usuarios-tienda-da566",
  storageBucket: "usuarios-tienda-da566.firebasestorage.app",
  messagingSenderId: "34400674433",
  appId: "1:34400674433:web:3df0ad5c9edca4b6e2a380",
  measurementId: "G-KK46JD9RHP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

window.guardarDireccionFirestore = async function (direccion) {
  if (!auth.currentUser) return null;

  const referencia = collection(db, 'usuarios', auth.currentUser.uid, 'direcciones');
  const documento = await addDoc(referencia, direccion);

  return documento.id;
};

window.obtenerDireccionesFirestore = async function () {
  if (!auth.currentUser) return [];

  const referencia = collection(db, 'usuarios', auth.currentUser.uid, 'direcciones');
  const snapshot = await getDocs(referencia);

  return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
};

window.eliminarDireccionFirestore = async function (id) {
  if (!auth.currentUser) return;

  await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'direcciones', id));
};

// El backend usa este token para confirmar quién eres antes de tocar tus
// tarjetas guardadas — nadie puede ver ni borrar las de otra persona.
window.obtenerTokenSesion = async function () {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
};

const btnCuenta = document.getElementById('btn-cuenta');
const cuentaDropdown = document.getElementById('cuenta-dropdown');
const btnIrCuenta = document.getElementById('btn-ir-cuenta');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const modal = document.getElementById('auth-modal');
const cerrarAuth = document.getElementById('cerrar-auth');
const titulo = document.getElementById('auth-titulo');
const nombreInput = document.getElementById('auth-nombre');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const btnPrincipal = document.getElementById('btn-auth-principal');
const btnGoogle = document.getElementById('btn-google');
const btnCambiar = document.getElementById('btn-cambiar-auth');
const authCambiar = document.getElementById('auth-cambiar');
const mensaje = document.getElementById('auth-mensaje');

let modoRegistro = false;
let usuarioActual = null;

function abrirModal() {
  if (usuarioActual) {
    cuentaDropdown.classList.toggle('open');
    btnCuenta.setAttribute('aria-expanded', cuentaDropdown.classList.contains('open'));
    return;
  }

  modal.classList.remove('oculto');
}

function cerrarDropdownCuenta() {
  cuentaDropdown.classList.remove('open');
  btnCuenta.setAttribute('aria-expanded', 'false');
}

function cerrarModal() {
  modal.classList.add('oculto');
  mensaje.textContent = '';
  emailInput.value = '';
  passwordInput.value = '';
  nombreInput.value = '';
}

function cambiarModo() {
  modoRegistro = !modoRegistro;

  if (modoRegistro) {
    titulo.textContent = 'Crear cuenta';
    nombreInput.classList.remove('oculto');
    btnPrincipal.textContent = 'Registrarme';
    authCambiar.innerHTML = `¿Ya tienes cuenta? <button id="btn-cambiar-auth">Inicia sesión</button>`;
  } else {
    titulo.textContent = 'Iniciar sesión';
    nombreInput.classList.add('oculto');
    btnPrincipal.textContent = 'Iniciar sesión';
    authCambiar.innerHTML = `¿No tienes cuenta? <button id="btn-cambiar-auth">Regístrate</button>`;
  }

  document.getElementById('btn-cambiar-auth').addEventListener('click', cambiarModo);
}

async function loginORegistro() {
  const nombre = nombreInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  mensaje.textContent = '';

  if (!email || !password) {
    mensaje.textContent = 'Escribe tu correo y contraseña.';
    return;
  }

  try {
    if (modoRegistro) {
      if (!nombre) {
        mensaje.textContent = 'Escribe tu nombre.';
        return;
      }

      const credencial = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(credencial.user, {
        displayName: nombre
      });

      cerrarModal();
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      cerrarModal();
    }
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      mensaje.textContent = 'Ese correo ya está registrado.';
    } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      mensaje.textContent = 'Correo o contraseña incorrectos. Si creaste tu cuenta con Google, usa "Continuar con Google".';
    } else if (error.code === 'auth/invalid-email') {
      mensaje.textContent = 'Escribe un correo válido.';
    } else if (error.code === 'auth/too-many-requests') {
      mensaje.textContent = 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    } else if (error.code === 'auth/network-request-failed') {
      mensaje.textContent = 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    } else if (error.code === 'auth/weak-password') {
      mensaje.textContent = 'La contraseña debe tener mínimo 6 caracteres.';
    } else {
      mensaje.textContent = 'No se pudo completar la acción.';
      console.error(error);
    }
  }
}

async function loginConGoogle() {
  mensaje.textContent = '';

  try {
    await signInWithPopup(auth, googleProvider);
    cerrarModal();
  } catch (error) {
    console.error(error);

    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      return;
    }

    if (error.code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (errorRedirect) {
        console.error(errorRedirect);
      }
    }

    if (error.code === 'auth/unauthorized-domain') {
      mensaje.textContent = 'Este sitio aún no está autorizado para iniciar sesión con Google. Avisa al administrador.';
    } else if (error.code === 'auth/network-request-failed') {
      mensaje.textContent = 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    } else {
      mensaje.textContent = 'No se pudo iniciar sesión con Google.';
    }
  }
}

onAuthStateChanged(auth, usuario => {
  usuarioActual = usuario;
  window.usuarioActual = usuario;

  const textoCuenta = btnCuenta.querySelector('.cuenta-texto') || btnCuenta;

  if (usuario) {
    const nombre = usuario.displayName || usuario.email;
    textoCuenta.textContent = nombre.length > 14 ? nombre.slice(0, 14) + '...' : nombre;
    btnCuenta.classList.add('sesion-activa');
  } else {
    textoCuenta.textContent = 'Cuenta';
    btnCuenta.classList.remove('sesion-activa');
    cerrarDropdownCuenta();
  }

  document.dispatchEvent(new CustomEvent('usuario-actualizado', { detail: usuario }));
});

btnCuenta.addEventListener('click', abrirModal);
cerrarAuth.addEventListener('click', cerrarModal);
btnPrincipal.addEventListener('click', loginORegistro);
btnGoogle.addEventListener('click', loginConGoogle);
btnCambiar.addEventListener('click', cambiarModo);

btnIrCuenta.addEventListener('click', () => {
  cerrarDropdownCuenta();
  document.dispatchEvent(new CustomEvent('abrir-mi-cuenta'));
});

btnCerrarSesion.addEventListener('click', () => {
  cerrarDropdownCuenta();
  signOut(auth);
});

document.addEventListener('click', evento => {
  if (!cuentaDropdown.contains(evento.target)) {
    cerrarDropdownCuenta();
  }
});

document.addEventListener('pedir-login', evento => {
  cerrarDropdownCuenta();
  modal.classList.remove('oculto');
  mensaje.textContent = (evento.detail && evento.detail.mensaje) || '';
});

modal.addEventListener('click', evento => {
  if (evento.target === modal) {
    cerrarModal();
  }
});