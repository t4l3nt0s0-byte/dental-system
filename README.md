# 🦷 DentalOS — Sistema Administrador Dental

Sistema completo de administración para consultorios dentales. Funciona **100% en el navegador** sin necesidad de backend — los datos se guardan en `localStorage`.

---

## 📁 Estructura de archivos

```
dental-system/
├── index.html          ← Dashboard principal (punto de entrada)
├── agenda.html         ← Agenda de citas con calendario interactivo
├── pacientes.html      ← Expedientes de pacientes
├── tratamientos.html   ← Control de tratamientos y costos
├── abonos.html         ← Abonos, pagos y saldos pendientes
├── catalogo.html       ← Catálogo de tratamientos y precios
├── cotizacion.html     ← Generador de cotizaciones imprimibles
├── ofertas.html        ← Promociones y descuentos
├── metricas.html       ← Métricas y gráficas del consultorio
├── busqueda.html       ← Búsqueda global en tiempo real
├── shared.js           ← Base de datos compartida (localStorage)
└── README.md           ← Este archivo
```

---

## 🚀 Cómo subir a GitHub Pages

### Opción A — Repositorio nuevo (recomendada)

```bash
# 1. Crear carpeta y entrar
mkdir dental-system && cd dental-system

# 2. Copiar todos los archivos .html, shared.js y README.md aquí

# 3. Inicializar repositorio
git init
git add .
git commit -m "🦷 DentalOS: sistema completo v1.0"

# 4. Crear repo en GitHub (sin README ni .gitignore)
#    En tu cuenta GitHub → New repository → dental-system

# 5. Conectar y subir
git remote add origin https://github.com/TU-USUARIO/dental-system.git
git branch -M main
git push -u origin main

# 6. Activar GitHub Pages
#    Settings → Pages → Branch: main → / (root) → Save
#    URL: https://TU-USUARIO.github.io/dental-system/
```

### Opción B — Dentro de un repo existente (subcarpeta)

```bash
# 1. Entrar a tu repo existente
cd tu-repo-existente

# 2. Crear subcarpeta dental
mkdir dental
# Copiar todos los archivos dentro de dental/

# 3. Commit y push
git add dental/
git commit -m "🦷 Agregar sistema dental"
git push

# 4. URL del sistema:
#    https://TU-USUARIO.github.io/tu-repo/dental/
```

### Opción C — GitHub CLI (más rápido)

```bash
# Instalar GitHub CLI si no lo tienes: https://cli.github.com
gh repo create dental-system --public --source=. --push
# Luego activar Pages desde Settings → Pages
```

---

## 🔗 Navegación entre páginas

Todas las páginas están enlazadas entre sí a través del **menú lateral** (sidebar). El archivo `shared.js` es la base de datos compartida que mantiene la consistencia de datos entre páginas usando `localStorage`.

```
index.html (Dashboard)
    ├── agenda.html        ← Citas del día / calendario
    ├── pacientes.html     ← Expedientes → tratamientos.html
    ├── tratamientos.html  ← Tratamientos → abonos.html
    ├── abonos.html        ← Pagos rápidos por paciente
    ├── catalogo.html      ← Precios → cotizacion.html
    ├── cotizacion.html    ← Genera presupuestos imprimibles
    ├── ofertas.html       ← Promociones activas
    ├── metricas.html      ← Gráficas y KPIs
    └── busqueda.html      ← Búsqueda global (atajo: tecla /)
```

---

## 💾 Datos y persistencia

- Los datos se almacenan en el **localStorage** del navegador.
- Al cerrar y abrir el sistema, los datos persisten.
- Para exportar datos: abrir la consola del navegador → `JSON.stringify(localStorage)`.
- Para importar o migrar a otra computadora: copiar y pegar el JSON en consola.

### Datos incluidos de ejemplo (del archivo Excel original)
- **5 pacientes** con su información médica completa
- **5 tratamientos** con estado de pagos real
- **5 abonos** con historial de pagos
- **2 citas** de ejemplo
- **14 tratamientos** en el catálogo con rangos de precios
- **4 ofertas** promocionales

---

## 🛠️ Personalización

### Cambiar nombre del consultorio
Busca en todos los archivos `.html`:
```
Consultorio Dental
```
Y reemplázalo con el nombre real.

### Cambiar teléfono y correo (cotizacion.html)
```html
<!-- Línea ~: -->
<div class="preview-sub">Tel: 55 0000 0000 · consultorio@dental.mx</div>
```

### Agregar logo real
En `index.html` y demás páginas, reemplaza el emoji 🦷 del `.logo-icon` con una etiqueta `<img>`:
```html
<div class="logo-icon"><img src="logo.png" style="width:24px;height:24px;object-fit:contain"></div>
```

---

## ✅ Funcionalidades del sistema

| Módulo | Función |
|---|---|
| 📊 Dashboard | KPIs, citas del día, adeudos, alertas |
| 📅 Agenda | Calendario mensual, agendar/ver citas por día |
| 👤 Expedientes | CRUD completo de pacientes con datos médicos |
| 🦷 Tratamientos | Registro de tratamientos, costos y estado de pago |
| 💰 Abonos | Registro de pagos, abonos rápidos, historial |
| 📚 Catálogo | Precios mínimos, máximos y sugeridos por tratamiento |
| 📝 Cotizaciones | Generador de presupuestos multi-tratamiento imprimible |
| 🎁 Ofertas | Gestión de promociones y descuentos |
| 📈 Métricas | Gráficas de facturación, cobros y estado de pagos |
| 🔍 Búsqueda | Búsqueda global en tiempo real con atajo `/` |

---

## 🔒 Consideraciones de seguridad

> ⚠️ Este sistema usa `localStorage` del navegador. Los datos **no están cifrados** y son accesibles desde la consola del navegador. Para uso con datos reales de pacientes, considera:
> - Usar un backend (Node.js + MongoDB o Firebase).
> - Agregar autenticación con contraseña.
> - Hospedar en servidor privado, no en GitHub Pages público.

---

*DentalOS v2026 — Desarrollado para gestión interna de consultorio dental.*
