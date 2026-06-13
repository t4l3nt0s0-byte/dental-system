// ============================================================
// firebase-config.js — Hersantych · Core Firebase Setup
// ============================================================

import { initializeApp } from "https://cdn.jsdelivr.net/npm/firebase@10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from "https://cdn.jsdelivr.net/npm/firebase@10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail } from "https://cdn.jsdelivr.net/npm/firebase@10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4KnJ9y0bbdbwrnd62K5QhZdiMC5-_EV8",
  authDomain: "dental-add.firebaseapp.com",
  projectId: "dental-add",
  storageBucket: "dental-add.firebasestorage.app",
  messagingSenderId: "1350878692",
  appId: "1:1350878692:web:1b11da0a68054d9f2bf3f1"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ─── PLAN DEFINITIONS ────────────────────────────────────────
const PLANES = {
  basico: {
    nombre: 'Básico',
    color: '#4A9EFF',
    maxPacientes: 50,
    maxUsuarios: 1,
    features: ['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda'],
    label: 'Individual'
  },
  profesional: {
    nombre: 'Profesional',
    color: '#00C2A8',
    maxPacientes: Infinity,
    maxUsuarios: 5,
    features: ['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios'],
    label: 'Consultorio'
  },
  premium: {
    nombre: 'Premium',
    color: '#F4B942',
    maxPacientes: Infinity,
    maxUsuarios: Infinity,
    features: ['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','multisucursal','kpi-avanzado'],
    label: 'Clínica'
  }
};

// ─── ROLES ───────────────────────────────────────────────────
const ROLES = {
  admin:      { label: 'Administrador', permisos: ['all'] },
  doctor:     { label: 'Doctor',        permisos: ['agenda','pacientes','tratamientos','odontograma'] },
  recepcion:  { label: 'Recepción',     permisos: ['agenda','pacientes','cotizacion','abonos'] },
  asistente:  { label: 'Asistente',     permisos: ['agenda','pacientes'] },
};

// ─── SESSION CACHE ────────────────────────────────────────────
let _currentUser = null;
let _currentClinica = null;

async function getSession() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) { resolve(null); return; }
      try {
        const uSnap = await getDoc(doc(db, 'usuarios', user.uid));
        if (!uSnap.exists()) { resolve(null); return; }
        const uData = uSnap.data();
        const cSnap = await getDoc(doc(db, 'clinicas', uData.clinicaId));
        _currentUser   = { uid: user.uid, email: user.email, ...uData };
        _currentClinica = { id: uData.clinicaId, ...cSnap.data() };
        resolve({ user: _currentUser, clinica: _currentClinica });
      } catch(e) { resolve(null); }
    });
  });
}

function requireAuth(allowedFeature) {
  return getSession().then(session => {
    if (!session) { window.location.href = 'login.html'; return null; }
    const plan = PLANES[session.clinica.plan] || PLANES.basico;
    if (allowedFeature && !plan.features.includes(allowedFeature) && session.user.rol !== 'admin') {
      window.location.href = 'planes.html';
      return null;
    }
    return session;
  });
}

// ─── FIRESTORE HELPERS ────────────────────────────────────────
function colRef(clinicaId, colName) {
  return collection(db, 'clinicas', clinicaId, colName);
}
function docRef(clinicaId, colName, docId) {
  return doc(db, 'clinicas', clinicaId, colName, docId);
}

async function getAll(clinicaId, colName, constraints = []) {
  const q = constraints.length
    ? query(colRef(clinicaId, colName), ...constraints)
    : query(colRef(clinicaId, colName), orderBy('creadoEn', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getOne(clinicaId, colName, id) {
  const snap = await getDoc(docRef(clinicaId, colName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function create(clinicaId, colName, data) {
  const ref = await addDoc(colRef(clinicaId, colName), { ...data, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
  return ref.id;
}

async function update(clinicaId, colName, id, data) {
  await updateDoc(docRef(clinicaId, colName, id), { ...data, actualizadoEn: serverTimestamp() });
}

async function remove(clinicaId, colName, id) {
  await deleteDoc(docRef(clinicaId, colName, id));
}

async function setDocument(clinicaId, colName, id, data) {
  await setDoc(docRef(clinicaId, colName, id), { ...data, actualizadoEn: serverTimestamp() }, { merge: true });
}

// ─── FORMAT UTILS ─────────────────────────────────────────────
function fmtMXN(n) {
  return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function genId(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase();
}

function IVA(monto) { return Number(monto) * 0.16; }
function conIVA(monto) { return Number(monto) * 1.16; }

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}

// ─── WHATSAPP HELPER ─────────────────────────────────────────
function whatsapp(tel, msg) {
  const num = tel.replace(/\D/g, '');
  const full = num.startsWith('52') ? num : '52' + num;
  window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ─── SIDEBAR ACTIVE STATE ─────────────────────────────────────
function setActive(page) {
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

// ─── PLAN GUARD UI ───────────────────────────────────────────
function planBadge(clinica) {
  const p = PLANES[clinica.plan] || PLANES.basico;
  return `<span class="plan-badge" style="background:${p.color}22;color:${p.color};border:1px solid ${p.color}44">${p.nombre}</span>`;
}

export {
  db, auth,
  PLANES, ROLES,
  getSession, requireAuth,
  colRef, docRef, getAll, getOne, create, update, remove, setDocument,
  fmtMXN, fmtDate, fmtDateInput, today, todayISO, genId, IVA, conIVA,
  toast, whatsapp, setActive, planBadge,
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail,
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp
};
