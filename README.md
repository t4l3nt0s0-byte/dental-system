# DentalOS — Sistema SaaS de Administración Dental

Sistema integral para consultorios dentales. Multi-sucursal, multi-usuario, con auditoría, CFDI, portal del paciente y API pública.

**Demo:** https://t4l3nt0s0-byte.github.io/dental-system/landing.html  
**App:** https://t4l3nt0s0-byte.github.io/dental-system/

---

## Organización del sistema

### Autenticación
| Archivo | Descripción |
|---|---|
| `landing.html` | Página de ventas pública |
| `login.html` | Inicio de sesión |
| `registro.html` | Registro de nuevo consultorio |
| `setup.html` | Onboarding wizard (5 pasos) |
| `legal.html` | Términos y privacidad |

### Dashboard y configuración
| Archivo | Descripción |
|---|---|
| `index.html` | Dashboard principal con KPIs |
| `metricas.html` | Métricas avanzadas y gráficas |
| `configuracion.html` | Configuración del consultorio |
| `planes.html` | Planes y suscripciones |
| `grupo.html` | Dashboard multi-sucursal |

### Pacientes (ciclo clínico)
| Archivo | Descripción |
|---|---|
| `pacientes.html` | Lista y búsqueda de pacientes |
| `expediente.html` | Expediente clínico completo |
| `odontograma.html` | Odontograma digital interactivo |
| `recetas.html` | Recetas médicas imprimibles |
| `paciente.html` | Portal público del paciente (sin login) |
| `recordatorios.html` | Recordatorios WA automáticos |

### Agenda
| Archivo | Descripción |
|---|---|
| `agenda.html` | Agenda con calendario mensual |
| `busqueda.html` | Búsqueda global del sistema |

### Clínica
| Archivo | Descripción |
|---|---|
| `tratamientos.html` | Planes de tratamiento |
| `cotizacion.html` | Cotizaciones para pacientes |
| `inventario.html` | Control de inventario |
| `catalogo.html` | Catálogo de servicios y precios |
| `ofertas.html` | Promociones y descuentos |

### Finanzas (recepción)
| Archivo | Descripción |
|---|---|
| `abonos.html` | Registro de pagos |
| `corte-caja.html` | Corte de caja + CFDI |
| `estado-cuenta.html` | Estado de cuenta por paciente |
| `recibo.html` | Generación de recibos |

### Reportes
| Archivo | Descripción |
|---|---|
| `reportes.html` | Reportes exportables |

### Importación
| Archivo | Descripción |
|---|---|
| `importar.html` | Importar desde Excel |
| `importar-datos.html` | Herramienta de importación |

### Administración (admin+)
| Archivo | Descripción |
|---|---|
| `usuarios.html` | Usuarios, roles y permisos |
| `auditoria.html` | Auditoría de acciones |
| `api.html` | API pública y rate limiting |

---

## Archivos del sistema

| Archivo | Descripción |
|---|---|
| `shared.js` | Core: Firebase, RBAC, caché, paginación, XSS, auditoría, folios, rate limiting |
| `shared.css` | Design system completo |
| `firebase-config.js` | Configuración Firebase (no usar directamente) |
| `firestore.rules` | Reglas de seguridad Firestore |
| `firestore.indexes.json` | Índices compuestos Firestore |

---

## Stack técnico

- **Frontend:** HTML5 + Vanilla JS (sin frameworks)
- **Backend:** Firebase Firestore + Authentication
- **Hosting:** GitHub Pages + Firebase Hosting
- **Pagos:** MercadoPago Checkout Pro
- **CFDI:** Facturapi
- **Búsqueda:** Firestore prefix queries (→ Typesense a 50+ clientes)

---

## Roadmap

- [x] RBAC 6 roles (owner/director/admin/doctor/recepción/asistente)
- [x] Multi-sucursal con dashboard de grupo
- [x] Auditoría de 15+ eventos
- [x] Portal del paciente (sin login)
- [x] WA automático de recordatorios
- [x] Sistema de folios únicos (EXP-YYYY-NNNNN)
- [x] Rate limiting en API
- [x] XSS sanitización completa
- [x] CFDI con Facturapi
- [x] Backup automático diario
- [ ] Seed data para nuevos usuarios
- [ ] MercadoPago cobro automático
- [ ] PWA instalable en móvil
- [ ] Analytics precalculados (Fase 2)
- [ ] Firebase Functions backend (Fase 2)
- [ ] Typesense búsqueda profesional (Fase 2)

---

## Estructura futura (cuando tengas 50+ clientes)

```
organizations/{orgId}/
  branches/{branchId}/
  patients/{patientId}/
  appointments/{appointmentId}/
  analytics/monthly/{YYYY-MM}
```

