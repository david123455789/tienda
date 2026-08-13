import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

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
const googleProvider = new GoogleAuthProvider();

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
    } else if (error.code === 'auth/invalid-credential') {
      mensaje.textContent = 'Correo o contraseña incorrectos.';
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
    mensaje.textContent = 'No se pudo iniciar sesión con Google.';
    console.error(error);
  }
}

onAuthStateChanged(auth, usuario => {
  usuarioActual = usuario;
  window.usuarioActual = usuario;

  if (usuario) {
    const nombre = usuario.displayName || usuario.email;
    btnCuenta.textContent = nombre.length > 14 ? nombre.slice(0, 14) + '...' : nombre;
    btnCuenta.classList.add('sesion-activa');
  } else {
    btnCuenta.textContent = 'Cuenta';
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

modal.addEventListener('click', evento => {
  if (evento.target === modal) {
    cerrarModal();
  }
});