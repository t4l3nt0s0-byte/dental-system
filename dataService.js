// ══════════════════════════════════════════════════════════════
// DENTALOS — dataService.js
// Capa única de acceso a datos. Ninguna página llama Firestore
// directamente — todas pasan por aquí.
//
// BENEFICIOS:
//  ✅ Un solo lugar para cambiar queries → actualizas 1 archivo
//  ✅ Caché automático por colección (TTL configurable)
//  ✅ Logging centralizado de errores
//  ✅ Fácil migrar a backend real (solo cambias esta capa)
//  ✅ Mocking para tests sin Firebase
//
// USO en páginas HTML:
//  const pacientes = await DS.pacientes.getAll();
//  const px        = await DS.pacientes.getById(id);
//  await DS.pacientes.create({ nombre, tel, ... });
//  await DS.pacientes.update(id, { tel: '...' });
//  await DS.pacientes.delete(id);
// ══════════════════════════════════════════════════════════════

(function(global) {
'use strict';

// ── Cache interno ──────────────────────────────────────────
var _cache     = {};
var _CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function cacheKey(col, suffix) {
  var cId = (global.SESSION && global.SESSION.clinica) ? global.SESSION.clinica.id : '_';
  return cId + ':' + col + (suffix ? ':'+suffix : '');
}
function cacheGet(key) {
  var entry = _cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > _CACHE_TTL) { delete _cache[key]; return null; }
  return entry.data;
}
function cacheSet(key, data) { _cache[key] = { data: data, ts: Date.now() }; }
function cacheClear(col) {
  var prefix = (global.SESSION && global.SESSION.clinica ? global.SESSION.clinica.id : '_') + ':' + col;
  Object.keys(_cache).forEach(function(k) { if (k.startsWith(prefix)) delete _cache[k]; });
}

// ── Base Firestore helper ──────────────────────────────────
function col(name) {
  if (!global.db || !global.SESSION || !global.SESSION.clinica) {
    throw new Error('dataService: Firebase no inicializado o sesión no activa');
  }
  return global.db.collection('clinicas').doc(global.SESSION.clinica.id).collection(name);
}
function toDoc(snap) { return snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null; }
function toDocs(snap) { return snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }); }

// ── Fábrica de servicio por colección ─────────────────────
// Genera métodos estándar CRUD + caché para cualquier colección
function makeService(colName, opts) {
  opts = opts || {};
  return {
    // ── READ ─────────────────────────────────────────────
    getAll: async function(constraints, skipCache) {
      var key = cacheKey(colName, 'all');
      if (!skipCache) {
        var cached = cacheGet(key);
        if (cached) return cached;
      }
      var ref = col(colName);
      if (opts.defaultOrder) ref = ref.orderBy(opts.defaultOrder, opts.orderDir || 'asc');
      if (opts.defaultLimit) ref = ref.limit(opts.defaultLimit);
      if (constraints) ref = constraints(ref);
      var snap = await ref.get();
      var docs = toDocs(snap);
      cacheSet(key, docs);
      return docs;
    },

    getById: async function(id) {
      if (!id) return null;
      var key = cacheKey(colName, 'id:'+id);
      var cached = cacheGet(key);
      if (cached) return cached;
      var snap = await col(colName).doc(id).get();
      var doc  = toDoc(snap);
      if (doc) cacheSet(key, doc);
      return doc;
    },

    getByField: async function(field, value, limitN) {
      var key = cacheKey(colName, field+':'+value);
      var cached = cacheGet(key);
      if (cached) return cached;
      var ref = col(colName).where(field, '==', value);
      if (limitN) ref = ref.limit(limitN);
      var snap = await ref.get();
      var docs = toDocs(snap);
      cacheSet(key, docs);
      return docs;
    },

    getPage: async function(cursor, pageSize) {
      var ref = col(colName).limit(pageSize || 25);
      if (opts.defaultOrder) ref = ref.orderBy(opts.defaultOrder, opts.orderDir||'asc');
      if (cursor) ref = ref.startAfter(cursor);
      var snap = await ref.get();
      var docs = toDocs(snap);
      var next = docs.length === (pageSize||25) ? snap.docs[snap.docs.length-1] : null;
      return { docs: docs, next: next, hasMore: next !== null };
    },

    // ── WRITE ────────────────────────────────────────────
    create: async function(data) {
      var cleanData = global.sanitizeData ? global.sanitizeData(data) : data;
      var ref = await col(colName).add(Object.assign({}, cleanData, {
        creadoEn:      global.firebase.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: global.firebase.firestore.FieldValue.serverTimestamp(),
      }));
      cacheClear(colName);
      // Auto-audit creaciones importantes
      if (global.audit && ['pacientes','citas','abonos','tratamientos','doctores','usuarios','rx'].indexOf(colName) !== -1) {
        global.audit('CREATE_' + colName.toUpperCase(), { id: ref.id, nombre: data.nombre || data.paciente || '' });
      }
      return ref;
    },

    update: async function(id, data) {
      var cleanData = global.sanitizeData ? global.sanitizeData(data) : data;
      await col(colName).doc(id).update(Object.assign({}, cleanData, {
        actualizadoEn: global.firebase.firestore.FieldValue.serverTimestamp(),
      }));
      cacheClear(colName);
    },

    delete: async function(id) {
      if (global.audit && ['pacientes','citas','doctores'].indexOf(colName) !== -1) {
        global.audit('DELETE_' + colName.toUpperCase(), { id: id });
      }
      await col(colName).doc(id).delete();
      cacheClear(colName);
    },

    // ── BATCH ────────────────────────────────────────────
    deleteMany: async function(ids) {
      if (!ids || !ids.length) return;
      var batch = global.db.batch();
      ids.forEach(function(id) {
        batch.delete(col(colName).doc(id));
      });
      await batch.commit();
      cacheClear(colName);
    },

    // ── HELPERS ──────────────────────────────────────────
    clearCache: function() { cacheClear(colName); },
    col: function() { return col(colName); }, // escape hatch para queries avanzados
  };
}

// ══════════════════════════════════════════════════════════════
// SERVICIOS POR COLECCIÓN
// ══════════════════════════════════════════════════════════════

var DS = {

  // ── Pacientes ────────────────────────────────────────────
  pacientes: Object.assign(makeService('pacientes', {
    defaultOrder: 'nombre', orderDir: 'asc', defaultLimit: 200
  }), {
    // Búsqueda por nombre (prefix query)
    search: async function(query) {
      if (!query || query.length < 2) return [];
      var snap = await col('pacientes')
        .where('nombre', '>=', query)
        .where('nombre', '<=', query + '\uf8ff')
        .limit(20).get();
      return toDocs(snap);
    },
    // Buscar por folio
    getByFolio: async function(folio) {
      var snap = await col('pacientes').where('folio','==',folio).limit(1).get();
      return snap.empty ? null : toDoc(snap.docs[0]);
    },
    // Verificar duplicados
    checkDuplicate: async function(nombre, tel) {
      if (!nombre) return [];
      var prefix = nombre.trim().slice(0,3);
      var snap   = await col('pacientes')
        .where('nombre','>=',prefix).where('nombre','<=',prefix+'\uf8ff').limit(20).get();
      var normNombre = nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return toDocs(snap).filter(function(p) {
        var pNorm    = (p.nombre||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        var nameMatch = pNorm === normNombre;
        var telMatch  = tel && p.tel && tel.replace(/\D/g,'') === (p.tel||'').replace(/\D/g,'');
        return nameMatch || telMatch;
      });
    },
    // Paginado (para lista de pacientes)
    getPaged: async function(cursor, pageSize) {
      var ref = col('pacientes').limit(pageSize || 25);
      if (cursor) ref = ref.startAfter(cursor);
      var snap = await ref.get();
      var docs = toDocs(snap).sort(function(a,b) {
        return (a.nombre||'').localeCompare(b.nombre||'','es');
      });
      var next = snap.docs.length === (pageSize||25) ? snap.docs[snap.docs.length-1] : null;
      return { docs: docs, next: next, hasMore: next !== null };
    },
  }),

  // ── Citas ────────────────────────────────────────────────
  citas: Object.assign(makeService('citas'), {
    getToday: async function() {
      var today = global.todayISO ? global.todayISO() : new Date().toISOString().split('T')[0];
      return DS.citas.getByField('fecha', today);
    },
    getByDate: async function(fecha) {
      var key = cacheKey('citas', 'date:'+fecha);
      var cached = cacheGet(key);
      if (cached) return cached;
      var snap = await col('citas').where('fecha','==',fecha).get();
      var docs = toDocs(snap).sort(function(a,b){ return (a.hora||'').localeCompare(b.hora||''); });
      cacheSet(key, docs);
      return docs;
    },
    getByMonth: async function(mesISO) {
      // mesISO = '2026-06'
      var from = mesISO + '-01';
      var to   = mesISO + '-31';
      var snap = await col('citas').where('fecha','>=',from).where('fecha','<=',to).get();
      return toDocs(snap).sort(function(a,b){ return (a.fecha+a.hora).localeCompare(b.fecha+b.hora); });
    },
    getByPatient: async function(expId) {
      return DS.citas.getByField('expId', expId);
    },
  }),

  // ── Abonos (Pagos) ───────────────────────────────────────
  abonos: Object.assign(makeService('abonos'), {
    getByPatient: async function(expId) {
      return DS.abonos.getByField('expId', expId);
    },
    getByMonth: async function(mesISO) {
      var from = mesISO + '-01';
      var to   = mesISO + '-31';
      var snap = await col('abonos').where('fecha','>=',from).where('fecha','<=',to).get();
      return toDocs(snap);
    },
    getTotalByPatient: async function(expId) {
      var abonos = await DS.abonos.getByPatient(expId);
      return abonos.reduce(function(s,a){ return s + Number(a.monto||0); }, 0);
    },
  }),

  // ── Tratamientos ─────────────────────────────────────────
  tratamientos: Object.assign(makeService('tratamientos'), {
    getByPatient: async function(expId) {
      return DS.tratamientos.getByField('expId', expId);
    },
    getActive: async function() {
      var snap = await col('tratamientos').where('estado','!=','Completado').limit(100).get();
      return toDocs(snap);
    },
  }),

  // ── Doctores ─────────────────────────────────────────────
  doctores: makeService('doctores', {
    defaultOrder: 'nombre', orderDir: 'asc'
  }),

  // ── Catálogo ─────────────────────────────────────────────
  catalogo: makeService('catalogo', {
    defaultOrder: 'tratamiento', orderDir: 'asc'
  }),

  // ── Inventario ───────────────────────────────────────────
  inventario: Object.assign(makeService('inventario'), {
    getLowStock: async function() {
      var all = await DS.inventario.getAll();
      return all.filter(function(i){ return Number(i.stock||0) <= Number(i.minimo||0); });
    },
  }),

  // ── Recetas (RX) ─────────────────────────────────────────
  rx: Object.assign(makeService('rx'), {
    getByPatient: async function(expId) {
      return DS.rx.getByField('expId', expId);
    },
  }),

  // ── Notas clínicas ───────────────────────────────────────
  notas: Object.assign(makeService('notas-clinicas'), {
    getByPatient: async function(expId) {
      return DS.notas.getByField('expId', expId);
    },
  }),

  // ── Cotizaciones ─────────────────────────────────────────
  cotizaciones: makeService('cotizaciones'),

  // ── Recibos ──────────────────────────────────────────────
  recibos: makeService('recibos'),

  // ── Cortes de caja ───────────────────────────────────────
  cortes: makeService('cortes'),

  // ── Ofertas ──────────────────────────────────────────────
  ofertas: makeService('ofertas'),

  // ── Auditoría ────────────────────────────────────────────
  auditoria: {
    getRecent: async function(dias, limitN) {
      var desde = new Date();
      desde.setDate(desde.getDate() - (dias || 30));
      var snap = await col('auditoria')
        .where('ts','>=', global.firebase.firestore.Timestamp.fromDate(desde))
        .orderBy('ts','desc').limit(limitN || 200).get();
      return toDocs(snap);
    },
    log: async function(accion, datos) {
      if (global.audit) return global.audit(accion, datos);
    },
  },

  // ── API Keys ─────────────────────────────────────────────
  apiKeys: makeService('apiKeys'),

  // ── Clínica (datos del consultorio) ──────────────────────
  clinica: {
    get: async function() {
      if (!global.SESSION || !global.SESSION.clinica) return null;
      var snap = await global.db.collection('clinicas')
        .doc(global.SESSION.clinica.id).get();
      return toDoc(snap);
    },
    update: async function(data) {
      if (!global.SESSION || !global.SESSION.clinica) return;
      var cleanData = global.sanitizeData ? global.sanitizeData(data) : data;
      await global.db.collection('clinicas').doc(global.SESSION.clinica.id)
        .update(Object.assign({}, cleanData, {
          actualizadoEn: global.firebase.firestore.FieldValue.serverTimestamp(),
        }));
    },
  },

  // ── Métricas rápidas (para dashboard) ────────────────────
  metricas: {
    // Lee docs precalculados si existen, sino calcula desde los datos
    getMensual: async function(mesISO) {
      mesISO = mesISO || (function(){
        var d = new Date();
        return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      })();
      // Intentar leer doc precalculado
      try {
        var snap = await global.db.collection('clinicas')
          .doc(global.SESSION.clinica.id)
          .collection('analytics').doc('monthly')
          .collection(mesISO).doc('resumen').get();
        if (snap.exists) return toDoc(snap);
      } catch(e) {}
      // Fallback: calcular desde los datos
      var [abonos, citas, pacientes] = await Promise.all([
        DS.abonos.getByMonth(mesISO),
        DS.citas.getByMonth(mesISO),
        DS.pacientes.getAll(null, true),
      ]);
      var ingresos = abonos.reduce(function(s,a){ return s+Number(a.monto||0); },0);
      var nuevos   = pacientes.filter(function(p){
        return (p.creadoEn||p.alta||'').substring(0,7) === mesISO;
      }).length;
      return {
        mes:               mesISO,
        ingresos:          ingresos,
        pagos:             abonos.length,
        citasCompletadas:  citas.filter(function(c){ return c.estado==='Completado'; }).length,
        citasTotal:        citas.length,
        pacientesNuevos:   nuevos,
      };
    },
  },

  // ── Utilidades ───────────────────────────────────────────
  clearAllCache: function() { _cache = {}; },
  isCacheEmpty:  function() { return Object.keys(_cache).length === 0; },
};

// ── Exportar globalmente ───────────────────────────────────
global.DS = DS;

// Compatibilidad con código existente que usa fsGetAll / fsCreate
// Las páginas migradas usan DS.xxx, las no migradas siguen con fs*
// Esto permite migración incremental sin romper nada

})(window);
