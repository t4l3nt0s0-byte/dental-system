# 🦷 DentalOS Hersantych — Guía de Configuración Completa

## Arquitectura
```
landing.html          → Página pública de marketing
registro.html         → Alta de nuevo consultorio (usa dental-saas + dental-add)
login.html            → Acceso al sistema (usa dental-add)
index.html            → Dashboard operativo
```

---

## PASO 1 — Firebase: dental-add (sistema principal)

### 1.1 Authentication
```
https://console.firebase.google.com/project/dental-add/authentication/providers

✅ Email/Password → Habilitar → Guardar
```

### 1.2 Firestore Rules
```
https://console.firebase.google.com/project/dental-add/firestore/rules

Copiar y pegar el contenido del archivo firestore.rules
→ Publicar
```

### 1.3 Firestore Indexes (crear si pide)
```
Cuando navegues el sistema y aparezca error de "index required",
haz clic en el link que aparece en la consola del navegador.
Los índices se crean automáticamente.
```

---

## PASO 2 — Firebase: dental-saas-f689c (registro público)

### 2.1 Authentication
```
https://console.firebase.google.com/project/dental-saas-f689c/authentication/providers

✅ Email/Password → Habilitar → Guardar
```

### 2.2 Firestore Rules (dental-saas)
```
https://console.firebase.google.com/project/dental-saas-f689c/firestore/rules

Pegar esto:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registros/{docId} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

### 2.3 Crear base de datos Firestore (si no existe)
```
https://console.firebase.google.com/project/dental-saas-f689c/firestore

→ Crear base de datos
→ Modo producción
→ Región: us-central (o nam5)
```

---

## PASO 3 — GitHub Pages

### 3.1 Verificar que todos los archivos están subidos
```
Archivos críticos:
✅ landing.html      → Página de ventas pública
✅ registro.html     → Registro de cuentas
✅ login.html        → Inicio de sesión
✅ shared.js         → Lógica compartida con límites de plan
✅ shared.css        → Estilos del sistema
✅ firestore.rules   → Solo referencia (no se publica, va en Firebase Console)
✅ index.html        → Dashboard
... (todos los demás módulos)
```

### 3.2 URL de acceso público
```
Landing:    https://t4l3nt0s0-byte.github.io/dental-system/landing.html
Registro:   https://t4l3nt0s0-byte.github.io/dental-system/registro.html
Login:      https://t4l3nt0s0-byte.github.io/dental-system/login.html
Sistema:    https://t4l3nt0s0-byte.github.io/dental-system/index.html
```

### 3.3 Hacer landing.html la página principal
```
Opción A: En GitHub repo Settings → Pages → seleccionar landing.html como root

Opción B: Crear un archivo index.html en la raíz del repo que redirija:
<meta http-equiv="refresh" content="0; url=landing.html">

Opción C: Renombrar landing.html → index.html (y el dashboard actual a dashboard.html)
```

---

## PASO 4 — Personalizar landing.html

Abrir landing.html y reemplazar:
```
521XXXXXXXXXX → Tu número de WhatsApp con código de país (ej: 5215512345678)
contacto@hersantych.com → Tu correo real
```

---

## PASO 5 — Probar el flujo completo

### 5.1 Prueba de registro
```
1. Ve a landing.html → "Crear cuenta gratis"
2. Llena: nombre del consultorio, ciudad, teléfono
3. Email: usa un gmail real
4. Contraseña: mínimo 6 caracteres
5. Debería crear:
   - Usuario en dental-add Authentication
   - Documento en dental-add/clinicas/{clinicaId}
   - Documento en dental-add/usuarios/{uid}
6. Redirigir a index.html automáticamente
```

### 5.2 Verificar en Firebase Console
```
dental-add → Authentication → Users
   → Debe aparecer el email que registraste

dental-add → Firestore → clinicas → clinica_{uid}
   → plan: "trial"
   → trialEnd: fecha 7 días adelante
   → maxPacientes: 5

dental-add → Firestore → usuarios → {uid}
   → rol: "admin"
   → clinicaId: "clinica_{uid}"
```

### 5.3 Prueba de límite de pacientes
```
Con cuenta trial:
1. Registrar 5 pacientes → debe funcionar
2. Intentar registrar el 6to → debe mostrar error o bloqueo
```

---

## PASO 6 — Límites de plan en el código

El archivo shared.js ya tiene los límites definidos:
```javascript
trial:        maxPacientes:5,  maxDoctores:0, maxRecepcion:0, 7 días
basico:       maxPacientes:50, maxDoctores:1, maxRecepcion:1
profesional:  maxPacientes:∞,  maxDoctores:2, maxRecepcion:1
premium:      maxPacientes:∞,  maxDoctores:∞, maxRecepcion:∞
```

Para que pacientes.html respete el límite, agregar en la función de guardar:
```javascript
// Al guardar nuevo paciente, verificar límite
const plan = SESSION.clinica.plan || 'trial';
const maxPx = PLANES[plan]?.maxPacientes || 5;
const totalPx = ALL_PACIENTES.length;
if(totalPx >= maxPx){
  showToast(`Plan ${plan}: máximo ${maxPx} pacientes. Actualiza tu plan.`, 'error');
  window.location.href = 'planes.html';
  return;
}
```

---

## PASO 7 — Manejo de pagos (siguiente etapa)

Cuando un cliente quiere contratar un plan:
```
Opciones recomendadas para México:
1. Stripe (tarjeta internacional) → stripe.com
2. Conekta (tarjeta + OXXO + transferencia)
3. MercadoPago (más conocido en México)
4. Transferencia manual + activación manual por ti en Firebase Console
```

### Activación manual (más fácil para empezar)
```
Cliente paga → tú confirmas → vas a Firebase Console:
dental-add → Firestore → clinicas → {clinicaId}
→ Editar campo 'plan': 'trial' → 'basico' / 'profesional' / 'premium'
→ El cliente ya tiene acceso al plan pagado
```

---

## PASO 8 — Panel maestro (tu panel como dueño del SaaS)

Para gestionar todos los consultorios desde un solo lugar:
```
Crear una página admin-panel.html que:
- Use dental-saas-f689c como base
- Liste todos los consultorios registrados
- Permita activar/cambiar planes
- Muestre métricas de uso

Solo tú (t4l3nt0s0@gmail.com) tienes acceso.
```

---

## Checklist final antes de lanzar

- [ ] Authentication habilitado en dental-add
- [ ] Authentication habilitado en dental-saas-f689c  
- [ ] Firestore Rules publicadas en dental-add
- [ ] Firestore Rules publicadas en dental-saas-f689c
- [ ] Número de WhatsApp actualizado en landing.html
- [ ] Correo de contacto actualizado en landing.html
- [ ] landing.html subido a GitHub
- [ ] Probado registro completo de cuenta trial
- [ ] Probado límite de 5 pacientes
- [ ] Probado expiración de trial (cambiar trialEnd manualmente a fecha pasada)
- [ ] URL de landing compartida con primeros clientes

---

## Soporte técnico de este sistema

Proyecto: DentalOS Hersantych  
Firebase DENTAL: dental-add  
Firebase SAAS: dental-saas-f689c  
GitHub: t4l3nt0s0-byte/dental-system  
Admin UID: AATvjPDfBwXa5qYm62kOvWRtSFo1  
