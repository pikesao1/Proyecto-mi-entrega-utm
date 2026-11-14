'use strict';
/* =========================================================
   Mi Entrega UTM — script.js
   Proyecto escolar de desarrollo web. JavaScript vanilla, sin librerías.

   Secciones:
     1. Reglas del sistema de puntos (constantes)
     2. Utilidades
     3. Almacenamiento (localStorage para datos, IndexedDB para fotos)
     4. Cuentas (registro, inicio y cierre de sesión)
     5. Lógica de puntos, rangos, racha y logros (funciones puras)
     6. Acciones sobre materias y tareas
     7. Vistas (dibujar cada pantalla)
     8. Eventos y arranque
     9. Autopruebas (revisa la consola del navegador)
   ========================================================= */

/* ---------------------------------------------------------
   1. REGLAS DEL SISTEMA DE PUNTOS
   Cambia estos valores para ajustar las reglas. Toda la app
   (cálculos, textos y tabla de reglas) los lee de aquí.
   --------------------------------------------------------- */
const PUNTOS_BASE = 50;               // entrega a tiempo
const BONUS_MARGEN = 30;              // bonus por entregar con mucho margen
const DIAS_PARA_BONUS = 2;            // margen mínimo (en días) para el bonus
const TOLERANCIA_HORAS = 2;           // horas después del límite sin penalización
const PENALIZACION_POR_PERIODO = 20;  // puntos que se restan por cada periodo de retraso
const HORAS_POR_PERIODO = 24;         // duración de un periodo de retraso
const VENTANA_DIAS = 14;              // los rangos usan los puntos de los últimos N días
const AMORTIGUAMIENTO = 10;           // puntos extra sobre el mínimo para subir de rango
const HORA_MADRUGADOR = 9;            // entregar antes de esta hora desbloquea "Madrugador"
const DIAS_SEMANA_SIN_ATRASOS = 7;    // días seguidos de racha para "Semana sin atrasos"
const HORAS_AVISO = 24;               // se avisa de las tareas que vencen en menos de estas horas
const MINUTOS_REVISION = 1;           // cada cuántos minutos se revisan los recordatorios

// Rangos ordenados de menor a mayor. "min" es el mínimo de puntos del rango.
const RANGOS = [
  { nombre: 'Bronce', min: 0 },
  { nombre: 'Plata', min: 100 },
  { nombre: 'Oro', min: 250 },
  { nombre: 'Diamante', min: 400 },
  { nombre: 'Zafiro', min: 600 },
];

// Logo de cada rango (SVG dibujado en el código, sin imágenes externas).
// Colores fijos de cada metal o gema, para que se reconozcan en los tres modos.
const LOGOS_RANGO = {
  // Escudo
  Bronce: '<path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z" fill="#cd7f32" stroke="#7a4a1c"/>'
    + '<path d="M8 10l4 3 4-3v2.6l-4 3-4-3z" fill="#fff" fill-opacity=".85"/>',
  // Medalla con listón
  Plata: '<path d="M6 2h4l2.5 6h-4zM18 2h-4l-2.5 6h4z" fill="#c0392b" stroke="#7b241c"/>'
    + '<circle cx="12" cy="15" r="7" fill="#c9d1d9" stroke="#5b6670"/>'
    + '<polygon points="12,11.8 12.76,13.95 15.04,14.01 13.24,15.4 13.88,17.59 12,16.3 10.12,17.59 10.76,15.4 8.96,14.01 11.24,13.95" fill="#fff" stroke="#5b6670" stroke-width=".6"/>',
  // Trofeo
  Oro: '<path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" fill="none" stroke="#a87b00" stroke-width="1.6"/>'
    + '<path d="M7 3h10v5a5 5 0 0 1-10 0zM11 13h2v4h-2zM8 18h8v3H8z" fill="#f5c518" stroke="#a87b00"/>'
    + '<rect x="9" y="4.5" width="1.4" height="4" rx=".7" fill="#fff" fill-opacity=".7"/>',
  // Diamante tallado
  Diamante: '<path d="M7 4h10l4 5-9 12L3 9z" fill="#7dd3fc" stroke="#0369a1"/>'
    + '<path d="M3 9h18M7 4l1.5 5L12 4l3.5 5L17 4M8.5 9L12 21l3.5-12" fill="none" stroke="#0369a1" stroke-width=".8"/>'
    + '<path d="M7 4L3 9h5.5z" fill="#fff" fill-opacity=".6"/>',
  // Corona con zafiro
  Zafiro: '<path d="M3 8l4.5 4L12 4l4.5 8L21 8l-2 11H5z" fill="#3b5bdb" stroke="#1e2a6e"/>'
    + '<path d="M5.6 16h12.8" stroke="#a5b4fc" stroke-width="1.2"/>'
    + '<circle cx="12" cy="12.5" r="1.8" fill="#dbe4ff"/>'
    + '<g fill="#91a7ff" stroke="#1e2a6e" stroke-width=".6"><circle cx="3" cy="8" r="1.3"/><circle cx="12" cy="4" r="1.3"/><circle cx="21" cy="8" r="1.3"/></g>',
};

const logoRango = (nombre) =>
  `<svg class="logo-rango" viewBox="0 0 24 24" aria-hidden="true" stroke-linejoin="round">${LOGOS_RANGO[nombre]}</svg>`;

// Insignia del rango: logo + nombre, con los colores del modo actual.
const insigniaRango = (nombre) => `<span class="insignia rango-${nombre}">${logoRango(nombre)}${nombre}</span>`;

const LOGROS = [
  { id: 'primera', nombre: 'Primera entrega a tiempo', descripcion: 'Entregaste tu primera tarea a tiempo.' },
  { id: 'semana', nombre: 'Semana sin atrasos', descripcion: `Tu racha actual de entregas a tiempo empezó hace ${DIAS_SEMANA_SIN_ATRASOS} días o más.` },
  { id: 'madrugador', nombre: 'Madrugador', descripcion: `Entregaste una tarea antes de las ${HORA_MADRUGADOR}:00 am.` },
];

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

// Claves de localStorage
const CLAVE_USUARIOS = 'meu_usuarios';
const CLAVE_SESION = 'meu_sesion';
const CLAVE_TEMA = 'meu_tema'; // modo de visualización, común a todas las cuentas de este navegador
const TEMAS = ['dia', 'mediodia', 'noche'];
const claveDatos = (usuario) => 'meu_datos_' + usuario;

/* ---------------------------------------------------------
   2. UTILIDADES
   --------------------------------------------------------- */
const $ = (selector) => document.querySelector(selector);

function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Convierte bytes (ArrayBuffer o Uint8Array) a texto hexadecimal.
function aHex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(datos) {
  return aHex(await crypto.subtle.digest('SHA-256', datos));
}

// Evita que el texto del usuario se interprete como HTML (previene inyección).
function esc(texto) {
  return String(texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatoFecha(iso) {
  return iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

// Un <input type="datetime-local"> usa la hora local sin zona; aquí convertimos ISO → ese formato.
function aInputLocal(iso) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatoDuracion(ms) {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / DIA_MS);
  const h = Math.floor((abs % DIA_MS) / HORA_MS);
  const m = Math.floor((abs % HORA_MS) / 60000);
  return d > 0 ? `${d} d ${h} h ${m} min` : `${h} h ${m} min`;
}

function textoMargen(margenMs) {
  return margenMs >= 0
    ? `${formatoDuracion(margenMs)} antes del límite`
    : `${formatoDuracion(margenMs)} después del límite`;
}

function signo(n) {
  return n > 0 ? `+${n}` : String(n);
}

/* ---------------------------------------------------------
   3. ALMACENAMIENTO
   - localStorage: usuarios, sesión y datos de cada usuario (JSON).
   - IndexedDB: fotos de las entregas como Blob (pueden pesar
     varios MB, demasiado para localStorage).
   --------------------------------------------------------- */
let db = null;            // conexión a IndexedDB (null si no está disponible)
let usuarioActual = null; // nombre del usuario con sesión iniciada
let datos = null;         // datos del usuario actual (ver datosVacios)

function probarLocalStorage() {
  try {
    localStorage.setItem('__prueba', '1');
    localStorage.removeItem('__prueba');
    return true;
  } catch (e) {
    return false;
  }
}

function leerJSON(clave, defecto) {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : defecto;
  } catch (e) {
    return defecto;
  }
}

function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (e) {
    // Puede pasar si localStorage está lleno o bloqueado: avisamos para que no se pierdan datos sin saberlo.
    avisar('No se pudieron guardar los cambios en este navegador (almacenamiento lleno o bloqueado).', 'error');
    return false;
  }
}

function datosVacios() {
  return {
    materias: [],       // { id, nombre, color, creada, eliminada? }
    tareas: [],         // { id, materiaId, descripcion, asignada, limite, estado, entrega, historialEntregas, eventos }
    puntos: [],         // movimientos: { fecha, tareaId, regla, puntos }
    logros: {},         // { idLogro: fechaISO }
    rango: RANGOS[0].nombre,
    mensajeRango: null, // { texto, fecha, tipo: 'sube' | 'baja' }
  };
}

function cargarDatos() {
  datos = leerJSON(claveDatos(usuarioActual), datosVacios());
}

function guardarDatos() {
  return guardarJSON(claveDatos(usuarioActual), datos);
}

function abrirIndexedDB() {
  return new Promise((resolve) => {
    try {
      if (!('indexedDB' in window)) return resolve(null);
      const peticion = indexedDB.open('mi-entrega-utm', 1);
      peticion.onupgradeneeded = () => peticion.result.createObjectStore('fotos');
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

function guardarFoto(clave, blob) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fotos', 'readwrite');
    tx.objectStore('fotos').put(blob, clave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function leerFoto(clave) {
  return new Promise((resolve, reject) => {
    const peticion = db.transaction('fotos', 'readonly').objectStore('fotos').get(clave);
    peticion.onsuccess = () => resolve(peticion.result || null);
    peticion.onerror = () => reject(peticion.error);
  });
}

/* ---------------------------------------------------------
   4. CUENTAS
   AVISO: esto es para un proyecto escolar, NO es seguridad de
   producción. Todo vive en el navegador: cualquiera con acceso
   a la computadora puede leer o modificar localStorage. La sal +
   SHA-256 solo evita guardar la contraseña en texto plano.
   Un sistema real usaría un servidor y un algoritmo lento
   (bcrypt, scrypt o Argon2).
   --------------------------------------------------------- */
async function hashContrasena(contrasena, salHex) {
  return sha256Hex(new TextEncoder().encode(salHex + contrasena));
}

function normalizarUsuario(texto) {
  return texto.trim().toLowerCase();
}

async function alRegistrar(evento) {
  evento.preventDefault();
  const error = $('#error-registro');
  const usuario = normalizarUsuario($('#reg-usuario').value);
  const contrasena = $('#reg-contrasena').value;
  const confirmar = $('#reg-confirmar').value;

  // Se acepta cualquier texto (acentos, ñ, espacios, @); esc() evita que se interprete como HTML.
  const largo = [...usuario].length;
  if (largo < 3 || largo > 30) {
    error.textContent = 'El usuario debe tener de 3 a 30 caracteres.';
    return;
  }
  if (contrasena.length < 6) {
    error.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  if (contrasena !== confirmar) {
    error.textContent = 'Las contraseñas no coinciden.';
    return;
  }
  const usuarios = leerJSON(CLAVE_USUARIOS, {});
  if (usuarios[usuario]) {
    error.textContent = 'Ese usuario ya existe. Elige otro o inicia sesión.';
    return;
  }

  const sal = aHex(crypto.getRandomValues(new Uint8Array(16)));
  usuarios[usuario] = { sal, hash: await hashContrasena(contrasena, sal), creado: new Date().toISOString() };
  if (!guardarJSON(CLAVE_USUARIOS, usuarios)) {
    error.textContent = 'No se pudo crear la cuenta: el navegador no permite guardar datos.';
    return;
  }
  error.textContent = '';
  $('#form-registro').reset();
  iniciarSesion(usuario);
}

async function alIniciarSesion(evento) {
  evento.preventDefault();
  const error = $('#error-login');
  const usuario = normalizarUsuario($('#login-usuario').value);
  const contrasena = $('#login-contrasena').value;

  if (!usuario || !contrasena) {
    error.textContent = 'Escribe tu usuario y tu contraseña.';
    return;
  }
  const registro = leerJSON(CLAVE_USUARIOS, {})[usuario];
  // Mismo mensaje en ambos casos para no revelar qué usuarios existen.
  if (!registro || (await hashContrasena(contrasena, registro.sal)) !== registro.hash) {
    error.textContent = 'Usuario o contraseña incorrectos.';
    return;
  }
  error.textContent = '';
  $('#form-login').reset();
  iniciarSesion(usuario);
}

function iniciarSesion(usuario) {
  usuarioActual = usuario;
  guardarJSON(CLAVE_SESION, usuario); // la sesión sigue activa hasta "Cerrar sesión"
  cargarDatos();
  mostrarVista('inicio');
}

function cerrarSesion() {
  try { localStorage.removeItem(CLAVE_SESION); } catch (e) { /* sin almacenamiento, nada que borrar */ }
  usuarioActual = null;
  datos = null;
  $('#aviso').hidden = true;
  mostrarVista('login');
}

/* ---------------------------------------------------------
   5. LÓGICA DE PUNTOS, RANGOS, RACHA Y LOGROS
   Son funciones "puras": reciben datos y devuelven un resultado
   sin tocar la pantalla. Así es fácil probarlas (ver sección 9).
   --------------------------------------------------------- */

/**
 * Calcula los puntos de una entrega a partir de la fecha límite y la hora de completado.
 * Devuelve la lista de reglas aplicadas para poder mostrar de dónde sale cada punto.
 * Decisión: el retraso se cuenta desde la fecha límite; la tolerancia solo
 * evita la penalización si el retraso es de 2 h o menos.
 */
function calcularResultadoEntrega(limiteISO, completadaISO) {
  const retrasoMs = new Date(completadaISO) - new Date(limiteISO);
  const reglas = [];
  let aTiempo;
  let periodos = 0;
  let penalizacion = 0;

  if (retrasoMs <= TOLERANCIA_HORAS * HORA_MS) {
    aTiempo = true;
    reglas.push({
      regla: retrasoMs <= 0 ? 'Entrega a tiempo' : `Entrega dentro de la tolerancia de ${TOLERANCIA_HORAS} h`,
      puntos: PUNTOS_BASE,
    });
    if (-retrasoMs >= DIAS_PARA_BONUS * DIA_MS) {
      reglas.push({ regla: `Bonus por entregar con ${DIAS_PARA_BONUS} días o más de margen`, puntos: BONUS_MARGEN });
    }
  } else {
    aTiempo = false;
    periodos = Math.ceil(retrasoMs / (HORAS_POR_PERIODO * HORA_MS)); // "o fracción" → redondeo hacia arriba
    penalizacion = Math.min(periodos * PENALIZACION_POR_PERIODO, PUNTOS_BASE); // mínimo 0 puntos por tarea
    reglas.push({ regla: 'Puntos base de la entrega', puntos: PUNTOS_BASE });
    reglas.push({
      regla: `Penalización: ${periodos} periodo(s) de ${HORAS_POR_PERIODO} h de retraso × ${PENALIZACION_POR_PERIODO}`
        + (penalizacion < periodos * PENALIZACION_POR_PERIODO ? ' (tope: mínimo 0 puntos por tarea)' : ''),
      puntos: -penalizacion,
    });
  }

  const total = reglas.reduce((suma, r) => suma + r.puntos, 0);
  return { aTiempo, retrasoMs, margenMs: -retrasoMs, periodos, penalizacion, reglas, total };
}

// Tareas entregadas ordenadas por hora de completado (de la más antigua a la más reciente).
function entregasOrdenadas(tareas) {
  return tareas
    .filter((t) => t.estado === 'entregada' && t.entrega)
    .sort((a, b) => new Date(a.entrega.completadaEn) - new Date(b.entrega.completadaEn));
}

// La racha cuenta entregas a tiempo consecutivas; una entrega tarde la reinicia.
function calcularRacha(tareas) {
  let racha = 0;
  let inicio = null;
  for (const t of entregasOrdenadas(tareas)) {
    if (t.entrega.aTiempo) {
      if (racha === 0) inicio = t.entrega.completadaEn;
      racha++;
    } else {
      racha = 0;
      inicio = null;
    }
  }
  return { racha, inicio };
}

function puntosEnVentana(movimientos, ahora = new Date()) {
  const desde = ahora.getTime() - VENTANA_DIAS * DIA_MS;
  const suma = movimientos
    .filter((m) => new Date(m.fecha).getTime() >= desde)
    .reduce((s, m) => s + m.puntos, 0);
  return Math.max(0, suma); // una reversión puede dejar la suma negativa; el mínimo es 0
}

function indiceRango(nombre) {
  return Math.max(0, RANGOS.findIndex((r) => r.nombre === nombre));
}

/**
 * Rango con amortiguamiento:
 * - Baja en cuanto los puntos quedan por debajo del mínimo del rango actual.
 * - Sube solo si los puntos alcanzan el mínimo del siguiente + AMORTIGUAMIENTO.
 * Así, con puntos entre 100 y 109, el rango no oscila entre Bronce y Plata.
 */
function calcularRango(rangoActual, puntos) {
  let i = indiceRango(rangoActual);
  while (i > 0 && puntos < RANGOS[i].min) i--;
  while (i < RANGOS.length - 1 && puntos >= RANGOS[i + 1].min + AMORTIGUAMIENTO) i++;
  return RANGOS[i].nombre;
}

// Recalcula el rango del usuario actual y, si cambió, guarda un mensaje neutral que explica por qué.
function actualizarRango(motivoForzado) {
  const puntos = puntosEnVentana(datos.puntos);
  const anterior = datos.rango;
  const nuevo = calcularRango(anterior, puntos);
  if (nuevo === anterior) return null;

  datos.rango = nuevo;
  const bajo = indiceRango(nuevo) < indiceRango(anterior);
  let texto;
  if (bajo) {
    const ultima = entregasOrdenadas(datos.tareas).at(-1);
    let motivo = motivoForzado;
    if (!motivo && ultima && !ultima.entrega.aTiempo) {
      motivo = `Tu última entrega fue con ${formatoDuracion(ultima.entrega.retrasoMs)} de retraso.`;
    }
    if (!motivo) {
      motivo = `Algunos puntos salieron de la ventana de ${VENTANA_DIAS} días; ahora tienes ${puntos} puntos.`;
    }
    texto = `Bajaste de ${anterior} a ${nuevo}. ${motivo} Entregar a tiempo las próximas tareas te devuelve puntos.`;
  } else {
    texto = `Subiste de ${anterior} a ${nuevo}. Tienes ${puntos} puntos en los últimos ${VENTANA_DIAS} días.`;
  }
  datos.mensajeRango = { texto, fecha: new Date().toISOString(), tipo: bajo ? 'baja' : 'sube' };
  return datos.mensajeRango;
}

// Desbloquea logros nuevos. Cada logro se guarda una sola vez con su fecha.
function revisarLogros(ahora = new Date()) {
  const entregas = entregasOrdenadas(datos.tareas);
  const { racha, inicio } = calcularRacha(datos.tareas);
  const cumple = {
    primera: entregas.some((t) => t.entrega.aTiempo),
    semana: racha > 0 && ahora - new Date(inicio) >= DIAS_SEMANA_SIN_ATRASOS * DIA_MS,
    madrugador: entregas.some((t) => new Date(t.entrega.completadaEn).getHours() < HORA_MADRUGADOR),
  };
  const nuevos = [];
  for (const logro of LOGROS) {
    if (cumple[logro.id] && !datos.logros[logro.id]) {
      datos.logros[logro.id] = ahora.toISOString();
      nuevos.push(logro.nombre);
    }
  }
  return nuevos;
}

// Días de calendario entre hoy y la fecha límite (0 = vence hoy, negativo = ya pasó el día).
function diasRestantes(limiteISO, ahora = new Date()) {
  const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((inicioDia(new Date(limiteISO)) - inicioDia(ahora)) / DIA_MS);
}

function urgencia(tarea) {
  if (tarea.estado === 'entregada') return { clase: 'entregada', texto: 'Entregada' };
  const ms = new Date(tarea.limite) - Date.now();
  const dias = diasRestantes(tarea.limite);
  if (ms < 0) return { clase: 'rojo', texto: `Vencida hace ${formatoDuracion(ms)}` };
  if (dias <= 0) return { clase: 'rojo', texto: `Vence hoy (faltan ${formatoDuracion(ms)})` };
  if (dias <= 3) return { clase: 'amarillo', texto: `Faltan ${dias} día(s)` };
  return { clase: 'verde', texto: `Faltan ${dias} días` };
}

/* ---------------------------------------------------------
   6. ACCIONES SOBRE MATERIAS Y TAREAS
   La bitácora de cada tarea solo crece: agregarEvento nunca borra.
   --------------------------------------------------------- */
const buscarTarea = (id) => datos.tareas.find((t) => t.id === id);
const buscarMateria = (id) => datos.materias.find((m) => m.id === id);
const materiasActivas = () => datos.materias.filter((m) => !m.eliminada);

function nombreMateria(id) {
  const m = buscarMateria(id);
  if (!m) return '(sin materia)';
  return m.eliminada ? `${m.nombre} (eliminada)` : m.nombre;
}

function agregarEvento(tarea, tipo, detalle) {
  tarea.eventos.push({ tipo, fecha: new Date().toISOString(), detalle });
}

function guardarMateria(evento) {
  evento.preventDefault();
  const error = $('#error-materia');
  const id = $('#materia-id').value;
  const nombre = $('#materia-nombre').value.trim();
  const color = $('#materia-color').value;

  if (!nombre) { error.textContent = 'Escribe el nombre de la materia.'; return; }
  if (nombre.length > 40) { error.textContent = 'El nombre puede tener hasta 40 caracteres.'; return; }
  // El color se usa dentro de un atributo style, así que solo aceptamos #rrggbb.
  if (!/^#[0-9a-f]{6}$/i.test(color)) { error.textContent = 'Elige un color válido.'; return; }
  const repetida = materiasActivas().some((m) => m.id !== id && m.nombre.toLowerCase() === nombre.toLowerCase());
  if (repetida) { error.textContent = 'Ya tienes una materia con ese nombre.'; return; }

  if (id) {
    const materia = buscarMateria(id);
    materia.nombre = nombre;
    materia.color = color;
  } else {
    datos.materias.push({ id: nuevoId(), nombre, color, creada: new Date().toISOString() });
  }
  if (!guardarDatos()) return;
  avisar(id ? 'Materia actualizada.' : 'Materia creada.', 'exito');
  limpiarFormMateria();
  renderMaterias();
}

function limpiarFormMateria() {
  $('#form-materia').reset();
  $('#materia-id').value = '';
  $('#titulo-materia').textContent = 'Nueva materia';
  $('#btn-cancelar-materia').hidden = true;
  $('#error-materia').textContent = '';
}

function editarMateria(id) {
  const materia = buscarMateria(id);
  $('#materia-id').value = materia.id;
  $('#materia-nombre').value = materia.nombre;
  $('#materia-color').value = materia.color;
  $('#titulo-materia').textContent = 'Editar materia';
  $('#btn-cancelar-materia').hidden = false;
  $('#materia-nombre').focus();
}

// Borrado lógico: la materia se oculta, pero sus tareas y eventos siguen en la bitácora.
function eliminarMateria(id) {
  const materia = buscarMateria(id);
  const pendientes = datos.tareas.filter((t) => t.materiaId === id && t.estado === 'pendiente').length;
  const pregunta = `¿Eliminar la materia "${materia.nombre}"?`
    + (pendientes ? ` Sus ${pendientes} tarea(s) pendiente(s) dejarán de aparecer en Inicio.` : '')
    + ' Su historial se conserva en la bitácora.';
  if (!confirm(pregunta)) return;
  materia.eliminada = new Date().toISOString();
  if (guardarDatos()) avisar('Materia eliminada. Su historial sigue en la bitácora.', 'exito');
  renderMaterias();
}

function abrirFormTarea(id, materiaId) {
  const activas = materiasActivas();
  if (!activas.length) {
    avisar('Primero crea una materia para poder agregarle tareas.', 'error');
    mostrarVista('materias');
    return;
  }
  const tarea = id ? buscarTarea(id) : null;
  $('#tarea-materia').innerHTML = activas.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('');
  $('#titulo-tarea').textContent = tarea ? 'Editar tarea' : 'Nueva tarea';
  $('#tarea-id').value = tarea ? tarea.id : '';
  $('#tarea-materia').value = tarea ? tarea.materiaId : (materiaId || activas[0].id);
  $('#tarea-descripcion').value = tarea ? tarea.descripcion : '';
  $('#tarea-asignada').value = aInputLocal(tarea ? tarea.asignada : new Date().toISOString());
  $('#tarea-limite').value = tarea ? aInputLocal(tarea.limite) : '';
  $('#error-tarea').textContent = '';
  mostrarVista('tarea');
}

function guardarTarea(evento) {
  evento.preventDefault();
  const error = $('#error-tarea');
  const id = $('#tarea-id').value;
  const materiaId = $('#tarea-materia').value;
  const descripcion = $('#tarea-descripcion').value.trim();
  const asignadaTexto = $('#tarea-asignada').value;
  const limiteTexto = $('#tarea-limite').value;

  const materia = buscarMateria(materiaId);
  if (!materia || materia.eliminada) { error.textContent = 'Elige una materia.'; return; }
  if (!descripcion) { error.textContent = 'Escribe la descripción de la tarea.'; return; }
  if (descripcion.length > 200) { error.textContent = 'La descripción puede tener hasta 200 caracteres.'; return; }
  if (!asignadaTexto || !limiteTexto) { error.textContent = 'Indica la fecha y hora de asignación y la fecha y hora límite.'; return; }

  const asignada = new Date(asignadaTexto);
  const limite = new Date(limiteTexto);
  if (isNaN(asignada) || isNaN(limite)) { error.textContent = 'Alguna de las fechas no es válida.'; return; }
  if (limite <= asignada) { error.textContent = 'La fecha límite debe ser posterior a la fecha de asignación.'; return; }

  if (id) {
    const tarea = buscarTarea(id);
    if (tarea.estado !== 'pendiente') { error.textContent = 'Solo puedes editar tareas pendientes. Reabre la tarea primero.'; return; }
    // Registramos qué cambió para que la corrección quede en la bitácora.
    const cambios = [];
    if (tarea.materiaId !== materiaId) cambios.push(`materia: ${nombreMateria(tarea.materiaId)} → ${materia.nombre}`);
    if (tarea.descripcion !== descripcion) cambios.push(`descripción: "${tarea.descripcion}" → "${descripcion}"`);
    if (tarea.asignada !== asignada.toISOString()) cambios.push(`asignación: ${formatoFecha(tarea.asignada)} → ${formatoFecha(asignada)}`);
    if (tarea.limite !== limite.toISOString()) cambios.push(`límite: ${formatoFecha(tarea.limite)} → ${formatoFecha(limite)}`);
    if (!cambios.length) { avisar('No hubo cambios en la tarea.'); mostrarVista('inicio'); return; }
    Object.assign(tarea, { materiaId, descripcion, asignada: asignada.toISOString(), limite: limite.toISOString() });
    agregarEvento(tarea, 'corregida', cambios.join('; '));
  } else {
    const tarea = {
      id: nuevoId(), materiaId, descripcion,
      asignada: asignada.toISOString(), limite: limite.toISOString(),
      estado: 'pendiente', entrega: null, historialEntregas: [], eventos: [],
    };
    agregarEvento(tarea, 'creada', `Materia: ${materia.nombre}. Límite: ${formatoFecha(tarea.limite)}`);
    datos.tareas.push(tarea);
  }
  if (!guardarDatos()) return;
  avisar(id ? 'Tarea corregida.' : 'Tarea creada.', 'exito');
  mostrarVista('inicio');
}

// Reabrir anula la entrega: se agrega un movimiento negativo (no se borra el positivo).
function reabrirTarea(id) {
  const tarea = buscarTarea(id);
  if (!tarea || tarea.estado !== 'entregada') return;
  if (!confirm(`¿Reabrir "${tarea.descripcion}"? Se revierten los ${tarea.entrega.puntos} puntos de esa entrega.`)) return;

  const ahora = new Date().toISOString();
  if (tarea.entrega.puntos) {
    datos.puntos.push({ fecha: ahora, tareaId: id, regla: 'Reapertura: se revierten los puntos de la entrega anterior', puntos: -tarea.entrega.puntos });
  }
  agregarEvento(tarea, 'reabierta', `Se anuló la entrega del ${formatoFecha(tarea.entrega.completadaEn)} y se revirtieron ${tarea.entrega.puntos} puntos.`);
  tarea.historialEntregas.push(tarea.entrega);
  tarea.entrega = null;
  tarea.estado = 'pendiente';

  const cambio = actualizarRango('Reabriste una tarea y se revirtieron sus puntos.');
  if (!guardarDatos()) return;
  avisar('Tarea reabierta. Vuelve a aparecer en tus pendientes.' + (cambio ? '\n' + cambio.texto : ''));
  mostrarVista(document.querySelector('.vista:not([hidden])').id.replace('vista-', ''));
}

// Borrado lógico, igual que las materias: la tarea desaparece de las listas, pero su historial queda en la bitácora.
// Solo se eliminan pendientes; una entregada se reabre primero para que se reviertan sus puntos.
function eliminarTarea(id) {
  const tarea = buscarTarea(id);
  if (!tarea || tarea.estado !== 'pendiente') return;
  if (!confirm(`¿Eliminar la tarea "${tarea.descripcion}"? No cambia tus puntos y su historial se conserva en la bitácora.`)) return;
  tarea.estado = 'eliminada';
  agregarEvento(tarea, 'eliminada', 'La tarea se eliminó y ya no aparece en pendientes ni en recordatorios.');
  if (!guardarDatos()) return;
  avisar('Tarea eliminada. Su historial sigue en la bitácora.', 'exito');
  mostrarVista(document.querySelector('.vista:not([hidden])').id.replace('vista-', ''));
}

/* ---------- Entrega con foto ---------- */
let entregaEnCurso = null; // { tareaId, archivo, huella, duplicadas }
let urlPreview = null;

function abrirEntrega(id) {
  const tarea = buscarTarea(id);
  if (!tarea || tarea.estado !== 'pendiente') return;
  if (!db) {
    avisar('No se puede entregar: este navegador no permite guardar fotos (IndexedDB no disponible). Prueba con otro navegador o fuera del modo privado.', 'error');
    return;
  }
  entregaEnCurso = { tareaId: id, archivo: null, huella: null, duplicadas: [] };
  $('#entregar-info').innerHTML = `<strong>${esc(tarea.descripcion)}</strong><br>`
    + `Materia: ${esc(nombreMateria(tarea.materiaId))}<br>Límite: ${formatoFecha(tarea.limite)}`;
  $('#form-entregar').reset();
  limpiarPreview();
  mostrarVista('entregar');
}

function limpiarPreview() {
  if (urlPreview) URL.revokeObjectURL(urlPreview);
  urlPreview = null;
  $('#entregar-preview').hidden = true;
  $('#entregar-duplicada').hidden = true;
  $('#entregar-resumen').innerHTML = '<dt>Estado</dt><dd>Elige una foto para ver el resumen.</dd>';
  $('#error-entregar').textContent = '';
  $('#btn-confirmar-entrega').disabled = true;
}

async function alElegirFoto() {
  limpiarPreview();
  const archivo = $('#entregar-foto').files[0];
  if (!archivo) return;
  if (!archivo.type.startsWith('image/')) {
    $('#error-entregar').textContent = 'El archivo debe ser una imagen (JPG, PNG, etc.).';
    return;
  }
  try {
    // Huella exacta de los bytes: dos archivos idénticos dan la misma huella.
    entregaEnCurso.huella = await sha256Hex(await archivo.arrayBuffer());
  } catch (e) {
    $('#error-entregar').textContent = 'No se pudo leer la foto. Intenta con otro archivo.';
    return;
  }
  entregaEnCurso.archivo = archivo;
  entregaEnCurso.duplicadas = datos.tareas.filter(
    (t) => t.id !== entregaEnCurso.tareaId && t.entrega && t.entrega.huella === entregaEnCurso.huella
  );

  urlPreview = URL.createObjectURL(archivo);
  $('#entregar-preview').src = urlPreview;
  $('#entregar-preview').hidden = false;

  if (entregaEnCurso.duplicadas.length) {
    const nombres = entregaEnCurso.duplicadas.map((t) => `"${t.descripcion}"`).join(', ');
    $('#entregar-duplicada').textContent = `⚠ Esta foto es idéntica (misma huella SHA-256) a la que entregaste en: ${nombres}. Revisa que sea la foto correcta.`;
    $('#entregar-duplicada').hidden = false;
  }
  renderResumenEntrega();
  $('#btn-confirmar-entrega').disabled = false;
}

function renderResumenEntrega() {
  const tarea = buscarTarea(entregaEnCurso.tareaId);
  const ahora = new Date();
  const r = calcularResultadoEntrega(tarea.limite, ahora.toISOString());
  $('#entregar-resumen').innerHTML = `
    <dt>Hora de completado</dt><dd>${formatoFecha(ahora)} <small>(se recalcula al confirmar)</small></dd>
    <dt>Hora de captura de la foto</dt><dd>${formatoFecha(new Date(entregaEnCurso.archivo.lastModified))}</dd>
    <dt>Margen de entrega</dt><dd>${textoMargen(r.margenMs)}</dd>
    <dt>Estado</dt><dd>${r.aTiempo ? 'A tiempo' : 'Con retraso'}</dd>
    <dt>Penalización</dt><dd>${r.penalizacion ? `−${r.penalizacion} puntos (${r.periodos} periodo(s) de ${HORAS_POR_PERIODO} h)` : 'Ninguna'}</dd>
    <dt>Puntos</dt><dd><ul>${r.reglas.map((x) => `<li>${signo(x.puntos)} · ${esc(x.regla)}</li>`).join('')}</ul>
      <strong>Total: ${r.total} puntos</strong></dd>
    <dt>Huella SHA-256</dt><dd><code>${entregaEnCurso.huella.slice(0, 16)}…</code></dd>`;
}

async function confirmarEntrega(evento) {
  evento.preventDefault();
  const tarea = buscarTarea(entregaEnCurso && entregaEnCurso.tareaId);
  if (!tarea || !entregaEnCurso.archivo) {
    $('#error-entregar').textContent = 'Elige una foto antes de confirmar.';
    return;
  }
  const boton = $('#btn-confirmar-entrega');
  boton.disabled = true; // evita entregar dos veces con doble clic

  const ahora = new Date().toISOString();
  const r = calcularResultadoEntrega(tarea.limite, ahora);
  const fotoId = `${usuarioActual}:${tarea.id}:${Date.now()}`;
  try {
    await guardarFoto(fotoId, entregaEnCurso.archivo);
  } catch (e) {
    $('#error-entregar').textContent = 'No se pudo guardar la foto (¿almacenamiento lleno?). La tarea sigue pendiente.';
    boton.disabled = false;
    return;
  }

  const archivo = entregaEnCurso.archivo;
  tarea.estado = 'entregada';
  tarea.entrega = {
    completadaEn: ahora,
    // El navegador no da la fecha EXIF sin leer el archivo a mano; usamos la última modificación del archivo.
    fotoCapturaEn: new Date(archivo.lastModified).toISOString(),
    fotoNombre: archivo.name,
    fotoId,
    huella: entregaEnCurso.huella,
    aTiempo: r.aTiempo,
    retrasoMs: r.retrasoMs,
    puntos: r.total,
    reglas: r.reglas,
  };
  const dup = entregaEnCurso.duplicadas.map((t) => `"${t.descripcion}"`).join(', ');
  agregarEvento(tarea, 'completada',
    `${r.aTiempo ? 'A tiempo' : 'Con retraso'} (${textoMargen(r.margenMs)}). ${signo(r.total)} puntos.`
    + (dup ? ` Advertencia: la huella de la foto coincide con ${dup}.` : ''));
  for (const x of r.reglas) datos.puntos.push({ fecha: ahora, tareaId: tarea.id, regla: x.regla, puntos: x.puntos });

  const logros = revisarLogros(new Date());
  const cambio = actualizarRango();
  if (!guardarDatos()) { boton.disabled = false; return; }

  const lineas = ['Entrega registrada.', ...r.reglas.map((x) => `${signo(x.puntos)} · ${x.regla}`), `Total: ${r.total} puntos.`];
  if (logros.length) lineas.push(`Logro desbloqueado: ${logros.join(', ')}.`);
  if (cambio) lineas.push(cambio.texto);
  entregaEnCurso = null;
  limpiarPreview();
  mostrarVista('inicio');
  avisar(lineas.join('\n'), 'exito');
}

async function verFoto(id) {
  const tarea = buscarTarea(id);
  if (!tarea || !tarea.entrega) return;
  const img = $('#dialogo-img');
  let blob = null;
  try { blob = db ? await leerFoto(tarea.entrega.fotoId) : null; } catch (e) { blob = null; }

  if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
  img.dataset.url = blob ? URL.createObjectURL(blob) : '';
  img.src = img.dataset.url;
  img.hidden = !blob;
  img.alt = `Foto de la entrega de "${tarea.descripcion}"`;

  const otras = datos.tareas.filter((t) => t.id !== id && t.entrega && t.entrega.huella === tarea.entrega.huella);
  $('#dialogo-titulo').textContent = tarea.descripcion;
  $('#dialogo-info').innerHTML = `
    ${blob ? '' : '<p class="advertencia">No se encontró la foto en este navegador.</p>'}
    <p><strong>Hora de captura:</strong> ${formatoFecha(tarea.entrega.fotoCapturaEn)}<br>
    <strong>Hora de completado:</strong> ${formatoFecha(tarea.entrega.completadaEn)}<br>
    <strong>Archivo:</strong> ${esc(tarea.entrega.fotoNombre)}<br>
    <strong>Huella SHA-256:</strong> <code>${tarea.entrega.huella.slice(0, 16)}…</code></p>
    ${otras.length ? `<p class="advertencia">⚠ Huella repetida: la misma foto se entregó en ${otras.map((t) => `"${esc(t.descripcion)}"`).join(', ')}.</p>` : ''}`;
  $('#dialogo-foto').showModal();
}

function exportarBitacora() {
  const contenido = {
    app: 'Mi Entrega UTM',
    usuario: usuarioActual,
    exportadoEn: new Date().toISOString(),
    nota: 'Las fotos no se incluyen; cada entrega trae su huella SHA-256.',
    reglas: { PUNTOS_BASE, BONUS_MARGEN, DIAS_PARA_BONUS, TOLERANCIA_HORAS, PENALIZACION_POR_PERIODO, HORAS_POR_PERIODO, VENTANA_DIAS, AMORTIGUAMIENTO, RANGOS },
    rango: datos.rango,
    puntosVentana: puntosEnVentana(datos.puntos),
    racha: calcularRacha(datos.tareas).racha,
    logros: datos.logros,
    materias: datos.materias,
    tareas: datos.tareas,
    movimientosPuntos: datos.puntos,
  };
  const blob = new Blob([JSON.stringify(contenido, null, 2)], { type: 'application/json' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `bitacora-${usuarioActual}-${new Date().toISOString().slice(0, 10)}.json`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

/* ---------------------------------------------------------
   7. VISTAS
   Solo una <section class="vista"> es visible a la vez.
   --------------------------------------------------------- */
const VISTAS_PRIVADAS = ['inicio', 'materias', 'tarea', 'entregar', 'bitacora', 'rangos'];

function mostrarVista(nombre) {
  if (VISTAS_PRIVADAS.includes(nombre) && !usuarioActual) nombre = 'login';
  document.querySelectorAll('.vista').forEach((s) => { s.hidden = s.id !== 'vista-' + nombre; });
  $('#menu').hidden = !usuarioActual;
  document.querySelectorAll('#menu [data-vista]').forEach((b) => {
    b.setAttribute('aria-current', b.dataset.vista === nombre ? 'page' : 'false');
  });

  if (usuarioActual) {
    revisarRecordatorios();
    // Los puntos "caducan" al salir de la ventana de 14 días, así que revisamos rango y logros al navegar.
    const logros = revisarLogros();
    const cambio = actualizarRango();
    if (logros.length || cambio) {
      guardarDatos();
      avisar([logros.length ? `Logro desbloqueado: ${logros.join(', ')}.` : '', cambio ? cambio.texto : ''].join('\n').trim());
    }
  }

  const dibujar = { inicio: renderInicio, materias: renderMaterias, bitacora: renderBitacora, rangos: renderRangos }[nombre];
  if (dibujar) dibujar();

  // Llevamos el foco al título de la pantalla (ayuda a lectores de pantalla y teclado).
  const titulo = document.querySelector(`#vista-${nombre} h2`);
  if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
}

// El CSS cambia todos los colores según el atributo data-tema de <html>.
function aplicarTema(tema) {
  if (!TEMAS.includes(tema)) tema = 'dia';
  document.documentElement.dataset.tema = tema;
  $('#selector-tema').value = tema;
}

function avisar(texto, tipo = 'info') {
  $('#aviso-texto').textContent = texto;
  $('#aviso').className = 'aviso aviso-' + tipo;
  $('#aviso').hidden = false;
}

function avisoSistema(texto) {
  const caja = $('#aviso-sistema');
  caja.insertAdjacentHTML('beforeend', `<p>${esc(texto)}</p>`);
  caja.hidden = false;
}

/* ---------------------------------------------------------
   RECORDATORIOS
   Usan la Notification API del navegador: es gratis y no necesita servidor.
   Limitación: solo avisa mientras la pestaña esté abierta (puede estar en segundo plano).
   --------------------------------------------------------- */
const avisadas = new Set(); // ids de tareas ya avisadas en esta sesión de la página

function revisarRecordatorios() {
  if (!usuarioActual || !datos) return;
  const idsActivas = new Set(materiasActivas().map((m) => m.id));
  const porVencer = datos.tareas.filter((t) => {
    const ms = new Date(t.limite) - Date.now();
    return t.estado === 'pendiente' && idsActivas.has(t.materiaId) && ms > 0 && ms <= HORAS_AVISO * HORA_MS && !avisadas.has(t.id);
  });
  if (!porVencer.length) return;

  const lineas = porVencer.map((t) => `“${t.descripcion}” (${nombreMateria(t.materiaId)}) vence en ${formatoDuracion(new Date(t.limite) - Date.now())}.`);
  porVencer.forEach((t, i) => {
    avisadas.add(t.id);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Tarea por vencer', { body: lineas[i] });
    }
  });
  avisar('⏰ Recordatorio:\n' + lineas.join('\n'), 'error');
}

// Muestra el estado del permiso en el botón de Inicio.
function actualizarBotonNotificaciones() {
  const boton = $('#btn-notificar');
  const estado = $('#estado-notificaciones');
  if (!('Notification' in window)) {
    boton.hidden = true;
    estado.textContent = 'Este navegador no admite notificaciones; solo verás el aviso dentro de la app.';
  } else if (Notification.permission === 'granted') {
    boton.hidden = true;
    estado.textContent = `Notificaciones activadas: te avisamos cuando falten menos de ${HORAS_AVISO} h (con la pestaña abierta).`;
  } else if (Notification.permission === 'denied') {
    boton.hidden = true;
    estado.textContent = 'Bloqueaste las notificaciones. Actívalas desde el candado junto a la dirección de la página.';
  } else {
    boton.hidden = false;
    estado.textContent = '';
  }
}

async function pedirPermisoNotificaciones() {
  try { await Notification.requestPermission(); } catch (e) { /* el navegador no dejó preguntar */ }
  actualizarBotonNotificaciones();
  if (Notification.permission === 'granted') {
    new Notification('Mi Entrega UTM', { body: 'Listo, así se verán tus recordatorios.' });
  }
}

// HTML de una tarea, reutilizado en Inicio y en Materias.
function htmlTarea(tarea) {
  const materia = buscarMateria(tarea.materiaId);
  const u = urgencia(tarea);
  const botones = tarea.estado === 'pendiente'
    ? `<button type="button" class="btn-primario" data-accion="entregar" data-id="${tarea.id}">Entregar</button>
       <button type="button" data-accion="editar-tarea" data-id="${tarea.id}">Editar</button>
       <button type="button" class="btn-peligro" data-accion="eliminar-tarea" data-id="${tarea.id}">Eliminar</button>`
    : `<button type="button" data-accion="ver-foto" data-id="${tarea.id}">Ver foto</button>
       <button type="button" data-accion="reabrir" data-id="${tarea.id}">Reabrir</button>`;
  return `
    <li class="tarea" style="--color-materia:${materia ? materia.color : '#cccccc'}">
      <p class="tarea-descripcion">${esc(tarea.descripcion)}</p>
      <p class="nota">${esc(nombreMateria(tarea.materiaId))} · Límite: ${formatoFecha(tarea.limite)}</p>
      <p><span class="urgencia urgencia-${u.clase}">${u.texto}</span></p>
      <div class="acciones">${botones}</div>
    </li>`;
}

function renderInicio() {
  $('#inicio-usuario').textContent = usuarioActual;
  const puntos = puntosEnVentana(datos.puntos);
  const i = indiceRango(datos.rango);
  const actual = RANGOS[i];
  const siguiente = RANGOS[i + 1];

  $('#inicio-rango').innerHTML = logoRango(actual.nombre) + actual.nombre;
  $('#inicio-rango').className = 'insignia rango-' + actual.nombre;
  $('#inicio-puntos').textContent = `${puntos} puntos en los últimos ${VENTANA_DIAS} días.`;

  const barra = $('#barra-rango');
  if (siguiente) {
    const meta = siguiente.min + AMORTIGUAMIENTO;
    barra.max = meta - actual.min;
    barra.value = Math.min(Math.max(puntos - actual.min, 0), barra.max);
    $('#texto-progreso').textContent = `Te faltan ${Math.max(0, meta - puntos)} puntos para ${siguiente.nombre} (se sube al llegar a ${meta}).`;
  } else {
    barra.max = 1;
    barra.value = 1;
    $('#texto-progreso').textContent = 'Estás en el rango más alto.';
  }

  const { racha } = calcularRacha(datos.tareas);
  $('#inicio-racha').textContent = `Racha: ${racha} entrega(s) seguida(s) a tiempo.`;

  const mensaje = $('#inicio-mensaje-rango');
  mensaje.hidden = !datos.mensajeRango;
  if (datos.mensajeRango) mensaje.textContent = `${formatoFecha(datos.mensajeRango.fecha)}: ${datos.mensajeRango.texto}`;

  // Pendientes de materias activas, de la fecha límite más cercana a la más lejana.
  const idsActivas = new Set(materiasActivas().map((m) => m.id));
  const pendientes = datos.tareas
    .filter((t) => t.estado === 'pendiente' && idsActivas.has(t.materiaId))
    .sort((a, b) => new Date(a.limite) - new Date(b.limite));
  $('#lista-pendientes').innerHTML = pendientes.length
    ? pendientes.map(htmlTarea).join('')
    : '<li class="vacio">No tienes tareas pendientes. Usa “+ Agregar tarea” para registrar una.</li>';
}

function renderMaterias() {
  // Recordamos qué materias estaban abiertas para que no se cierren al redibujar.
  const abiertas = new Set([...document.querySelectorAll('#lista-materias details[open]')].map((d) => d.dataset.id));
  const activas = materiasActivas();
  $('#lista-materias').innerHTML = activas.length ? activas.map((m) => {
    const tareas = datos.tareas.filter((t) => t.materiaId === m.id && t.estado !== 'eliminada').sort((a, b) => new Date(a.limite) - new Date(b.limite));
    const pendientes = tareas.filter((t) => t.estado === 'pendiente').length;
    return `
      <li class="materia" style="--color-materia:${m.color}">
        <details data-id="${m.id}" ${abiertas.has(m.id) ? 'open' : ''}>
          <summary><span class="punto-color" aria-hidden="true"></span>${esc(m.nombre)}
            <span class="contador">(${pendientes} pendiente(s) de ${tareas.length})</span></summary>
          <div class="acciones">
            <button type="button" class="btn-primario" data-accion="nueva-tarea" data-id="${m.id}">+ Tarea</button>
            <button type="button" data-accion="editar-materia" data-id="${m.id}">Editar materia</button>
            <button type="button" class="btn-peligro" data-accion="eliminar-materia" data-id="${m.id}">Eliminar materia</button>
          </div>
          <ul class="lista-tareas">${tareas.map(htmlTarea).join('') || '<li class="vacio">Sin tareas todavía.</li>'}</ul>
        </details>
      </li>`;
  }).join('') : '<li class="vacio">Aún no tienes materias. Crea la primera con el formulario de arriba.</li>';
}

function renderBitacora() {
  // Filtro de materias (incluye eliminadas, porque su historial sigue existiendo).
  const filtro = $('#filtro-materia');
  const elegida = filtro.value;
  filtro.innerHTML = '<option value="">Todas</option>'
    + datos.materias.map((m) => `<option value="${m.id}">${esc(nombreMateria(m.id))}</option>`).join('');
  filtro.value = datos.materias.some((m) => m.id === elegida) ? elegida : '';

  const estado = $('#filtro-estado').value;
  const tareas = datos.tareas
    .filter((t) => (!filtro.value || t.materiaId === filtro.value) && (!estado || t.estado === estado))
    .sort((a, b) => new Date(b.asignada) - new Date(a.asignada));

  // Cuántas tareas usan cada huella (para marcar las repetidas).
  const usosHuella = {};
  for (const t of datos.tareas) if (t.entrega) usosHuella[t.entrega.huella] = (usosHuella[t.entrega.huella] || 0) + 1;

  $('#lista-bitacora').innerHTML = tareas.length ? tareas.map((t) => `
    <li>
      <details>
        <summary><strong>${esc(t.descripcion)}</strong> — ${esc(nombreMateria(t.materiaId))} — ${t.estado}</summary>
        <ol>${t.eventos.map((e) => `<li><time datetime="${e.fecha}">${formatoFecha(e.fecha)}</time> · <strong>${e.tipo}</strong>: ${esc(e.detalle)}</li>`).join('')}</ol>
      </details>
    </li>`).join('') : '<li class="vacio">No hay tareas con esos filtros.</li>';

  $('#tabla-revision').innerHTML = tareas.length ? tareas.map((t) => {
    const e = t.entrega;
    const repetida = e && usosHuella[e.huella] > 1;
    return `
      <tr>
        <td>${esc(t.descripcion)}<br><small>${esc(nombreMateria(t.materiaId))}</small></td>
        <td>${formatoFecha(t.asignada)}</td>
        <td>${formatoFecha(t.limite)}</td>
        <td>${e ? formatoFecha(e.completadaEn) : '—'}</td>
        <td>${e ? textoMargen(-e.retrasoMs) : '—'}</td>
        <td>${t.estado}${e ? (e.aTiempo ? ' (a tiempo)' : ' (con retraso)') : ''}</td>
        <td>${e ? `<button type="button" data-accion="ver-foto" data-id="${t.id}">Ver foto</button>` : '—'}
            ${repetida ? '<br><span class="repetida">⚠ Huella repetida</span>' : ''}</td>
      </tr>`;
  }).join('') : '<tr><td colspan="7">No hay tareas con esos filtros.</td></tr>';
}

function renderRangos() {
  const puntos = puntosEnVentana(datos.puntos);
  $('#rangos-puntos').innerHTML = `Rango actual: ${insigniaRango(datos.rango)} · `
    + `<strong>${puntos}</strong> puntos en los últimos ${VENTANA_DIAS} días.`;

  const mensaje = $('#rangos-mensaje');
  mensaje.hidden = !datos.mensajeRango;
  if (datos.mensajeRango) mensaje.textContent = `${formatoFecha(datos.mensajeRango.fecha)}: ${datos.mensajeRango.texto}`;

  $('#tabla-rangos').innerHTML = RANGOS.map((r, i) => {
    const siguiente = RANGOS[i + 1];
    const actual = r.nombre === datos.rango;
    return `
      <tr class="${actual ? 'fila-actual' : ''}">
        <td>${insigniaRango(r.nombre)}${actual ? ' (tu rango)' : ''}</td>
        <td>${siguiente ? `${r.min} a ${siguiente.min - 1}` : `${r.min} o más`}</td>
        <td>${i === 0 ? '—' : `${r.min + AMORTIGUAMIENTO} puntos`}</td>
      </tr>`;
  }).join('');

  $('#lista-logros').innerHTML = LOGROS.map((l) => {
    const fecha = datos.logros[l.id];
    return `<li class="${fecha ? '' : 'logro-bloqueado'}"><strong>${fecha ? '🏅' : '🔒'} ${l.nombre}</strong><br>
      ${l.descripcion}<br><small>${fecha ? `Desbloqueado el ${formatoFecha(fecha)}` : 'Bloqueado'}</small></li>`;
  }).join('');

  $('#lista-reglas').innerHTML = [
    `Entrega a tiempo: +${PUNTOS_BASE} puntos.`,
    `Bonus: +${BONUS_MARGEN} puntos si entregas con ${DIAS_PARA_BONUS} días o más de margen.`,
    `Tolerancia: ${TOLERANCIA_HORAS} h después del límite sin penalización.`,
    `Penalización: −${PENALIZACION_POR_PERIODO} puntos por cada ${HORAS_POR_PERIODO} h (o fracción) de retraso; mínimo 0 puntos por tarea.`,
    `Racha: entregas seguidas a tiempo; un retraso la reinicia.`,
    `Rango: según los puntos de los últimos ${VENTANA_DIAS} días. Para subir necesitas ${AMORTIGUAMIENTO} puntos más del mínimo del rango.`,
  ].map((t) => `<li>${t}</li>`).join('');

  const desde = Date.now() - VENTANA_DIAS * DIA_MS;
  $('#lista-movimientos').innerHTML = datos.puntos.length ? [...datos.puntos].reverse().map((m) => {
    const tarea = buscarTarea(m.tareaId);
    const fuera = new Date(m.fecha).getTime() < desde;
    return `<li class="${fuera ? 'fuera-ventana' : ''}">
      <span class="${m.puntos >= 0 ? 'positivo' : 'negativo'}">${signo(m.puntos)}</span> · ${esc(m.regla)}<br>
      <small>${formatoFecha(m.fecha)} · ${tarea ? esc(tarea.descripcion) : ''}${fuera ? ' · fuera de la ventana de 14 días' : ''}</small></li>`;
  }).join('') : '<li class="vacio">Todavía no tienes movimientos de puntos.</li>';
}

/* ---------------------------------------------------------
   8. EVENTOS Y ARRANQUE
   --------------------------------------------------------- */
function conectarEventos() {
  $('#form-registro').addEventListener('submit', alRegistrar);
  $('#form-login').addEventListener('submit', alIniciarSesion);
  $('#form-materia').addEventListener('submit', guardarMateria);
  $('#btn-cancelar-materia').addEventListener('click', limpiarFormMateria);
  $('#form-tarea').addEventListener('submit', guardarTarea);
  $('#entregar-foto').addEventListener('change', alElegirFoto);
  $('#form-entregar').addEventListener('submit', confirmarEntrega);
  $('#filtro-materia').addEventListener('change', renderBitacora);
  $('#filtro-estado').addEventListener('change', renderBitacora);
  $('#btn-exportar').addEventListener('click', exportarBitacora);
  $('#btn-notificar').addEventListener('click', pedirPermisoNotificaciones);
  $('#btn-salir').addEventListener('click', cerrarSesion);
  $('#aviso-cerrar').addEventListener('click', () => { $('#aviso').hidden = true; });
  $('#btn-cerrar-dialogo').addEventListener('click', () => $('#dialogo-foto').close());
  $('#selector-tema').addEventListener('change', (e) => {
    aplicarTema(e.target.value);
    guardarJSON(CLAVE_TEMA, e.target.value);
  });

  // Delegación: un solo listener atiende todos los botones con data-vista o data-accion,
  // incluso los que se crean después con innerHTML.
  document.addEventListener('click', (evento) => {
    const vista = evento.target.closest('[data-vista]');
    if (vista) { mostrarVista(vista.dataset.vista); return; }

    const boton = evento.target.closest('[data-accion]');
    if (!boton) return;
    const id = boton.dataset.id;
    switch (boton.dataset.accion) {
      case 'nueva-tarea': abrirFormTarea(null, id); break;
      case 'editar-tarea': abrirFormTarea(id); break;
      case 'entregar': abrirEntrega(id); break;
      case 'reabrir': reabrirTarea(id); break;
      case 'ver-foto': verFoto(id); break;
      case 'editar-materia': editarMateria(id); break;
      case 'eliminar-materia': eliminarMateria(id); break;
      case 'eliminar-tarea': eliminarTarea(id); break;
    }
  });
}

async function iniciarApp() {
  // Primero el modo, para que la pantalla no parpadee con otros colores.
  // Si nunca se eligió uno, se usa el modo claro u oscuro del sistema.
  const modoSistema = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'noche' : 'dia';
  aplicarTema(leerJSON(CLAVE_TEMA, modoSistema));
  conectarEventos();

  if (!probarLocalStorage()) {
    avisoSistema('Este navegador no permite usar localStorage (¿modo privado o cookies bloqueadas?). La app no podrá guardar tus datos.');
  }
  if (!window.crypto || !crypto.subtle) {
    avisoSistema('Este navegador no ofrece crypto.subtle, necesario para las contraseñas y las huellas de las fotos. Usa una versión reciente de Chrome, Edge o Firefox.');
    return;
  }
  db = await abrirIndexedDB();
  if (!db) {
    avisoSistema('IndexedDB no está disponible: puedes usar la app, pero no podrás entregar tareas con foto.');
  }

  autoPruebas();
  actualizarBotonNotificaciones();
  setInterval(revisarRecordatorios, MINUTOS_REVISION * 60 * 1000);

  const sesion = leerJSON(CLAVE_SESION, null);
  const usuarios = leerJSON(CLAVE_USUARIOS, {});
  if (sesion && usuarios[sesion]) {
    iniciarSesion(sesion);
  } else {
    // Primera vez (sin cuentas): registro. Si ya hay cuentas: inicio de sesión.
    mostrarVista(Object.keys(usuarios).length ? 'login' : 'registro');
  }
}

/* ---------------------------------------------------------
   9. AUTOPRUEBAS
   Revisan las reglas de puntos y rangos al cargar la página.
   Si algo falla, aparece un error en la consola (F12).
   --------------------------------------------------------- */
function autoPruebas() {
  const limite = '2026-01-10T12:00:00.000Z';
  const despues = (ms) => new Date(Date.parse(limite) + ms).toISOString();
  const casos = [
    // [hora de completado, puntos esperados, ¿a tiempo?]
    [despues(-3 * DIA_MS), 80, true],   // base + bonus
    [despues(-2 * DIA_MS), 80, true],   // justo 2 días de margen → bonus
    [despues(-HORA_MS), 50, true],      // a tiempo, sin bonus
    [despues(2 * HORA_MS), 50, true],   // al borde de la tolerancia
    [despues(3 * HORA_MS), 30, false],  // 1 periodo de retraso
    [despues(25 * HORA_MS), 10, false], // 2 periodos
    [despues(4 * DIA_MS), 0, false],    // nunca baja de 0
  ];
  for (const [completada, puntos, aTiempo] of casos) {
    const r = calcularResultadoEntrega(limite, completada);
    console.assert(r.total === puntos && r.aTiempo === aTiempo, 'Regla de puntos falló:', completada, r);
  }
  console.assert(calcularRango('Bronce', 105) === 'Bronce', 'Amortiguamiento: 105 no alcanza para Plata');
  console.assert(calcularRango('Bronce', 110) === 'Plata', 'Con 110 se sube a Plata');
  console.assert(calcularRango('Plata', 100) === 'Plata', 'Con 100 se mantiene Plata');
  console.assert(calcularRango('Plata', 99) === 'Bronce', 'Con 99 se baja a Bronce');
  console.assert(calcularRango('Bronce', 700) === 'Zafiro', 'Puede subir varios rangos');
  console.assert(calcularRango('Zafiro', 0) === 'Bronce', 'Puede bajar varios rangos');
}

iniciarApp();
