/* shared.js — navegación y utilidades compartidas */
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


console.log("Firebase conectado");
const NAV_HTML = `
<aside class="sidebar" id="sidebar">
  <div class="sidebar-logo">
    <div class="logo-mark">
      <div class="logo-icon">🦷</div>
      <div>
        <div class="logo-text">Dental<span>OS</span></div>
        <div class="logo-sub">Sistema integral</div>
      </div>
    </div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section">Principal</div>
    <a href="index.html" class="nav-item" data-page="index">📊 Dashboard</a>
    <a href="agenda.html" class="nav-item" data-page="agenda">📅 Agenda de Citas</a>
    <a href="pacientes.html" class="nav-item" data-page="pacientes">👤 Expedientes</a>
    <div class="nav-section">Clínica</div>
    <a href="tratamientos.html" class="nav-item" data-page="tratamientos">🦷 Tratamientos</a>
    <a href="abonos.html" class="nav-item" data-page="abonos">💰 Abonos & Pagos</a>
    <a href="catalogo.html" class="nav-item" data-page="catalogo">📚 Catálogo & Precios</a>
    <a href="cotizacion.html" class="nav-item" data-page="cotizacion">📝 Cotizaciones</a>
    <div class="nav-section">Más</div>
    <a href="ofertas.html" class="nav-item" data-page="ofertas">🎁 Ofertas & Promos</a>
    <a href="metricas.html" class="nav-item" data-page="metricas">📈 Métricas</a>
    <a href="busqueda.html" class="nav-item" data-page="busqueda">🔍 Búsqueda</a>
  </nav>
  <div class="sidebar-footer">
    <div class="clinic-name">Consultorio Dental</div>
    <div class="clinic-info">Dr. Administrador · v2026</div>
  </div>
</aside>`;

// Shared data (localStorage simulation)
const DB = {
  pacientes: JSON.parse(localStorage.getItem('dental_pacientes') || 'null') || [
    {exp:'P-001',nombre:'GARCÍA LÓPEZ MARÍA ELENA',fnac:'15/03/1985',edad:41,genero:'Femenino',tel:'5512345678',email:'maria@mail.com',alergias:'Ninguna',padecimientos:'Ninguna',alta:'01/01/2024',visitas:0},
    {exp:'P-002',nombre:'LÓPEZ VEGA CARLOS ALBERTO',fnac:'22/07/1990',edad:35,genero:'Masculino',tel:'5598765432',email:'carlos@mail.com',alergias:'Penicilina',padecimientos:'Hipertensión',alta:'15/03/2024',visitas:0},
    {exp:'P-003',nombre:'HERNÁNDEZ RUIZ MARÍA GUADALUPE',fnac:'30/11/1978',edad:47,genero:'Femenino',tel:'5511223344',email:'mhernandez@mail.com',alergias:'Ninguna',padecimientos:'Diabetes T2',alta:'20/08/2023',visitas:0},
    {exp:'P-004',nombre:'RAMÍREZ TORRES JOSÉ ANTONIO',fnac:'08/01/1995',edad:31,genero:'Masculino',tel:'5544332211',email:'jose.rt@mail.com',alergias:'Ninguna',padecimientos:'Ninguna',alta:'15/01/2025',visitas:0},
    {exp:'P-005',nombre:'FLORES DÍAZ ANA SOFÍA',fnac:'25/09/1988',edad:37,genero:'Femenino',tel:'5566778899',email:'ana.flores@mail.com',alergias:'Penicilina',padecimientos:'Ninguna',alta:'01/06/2024',visitas:0},
  ],
  tratamientos: JSON.parse(localStorage.getItem('dental_tratamientos') || 'null') || [
    {id:'T-001',exp:'P-001',paciente:'GARCÍA LÓPEZ MARÍA ELENA',tratamiento:'Endodoncia',desc:'Molar inferior izquierdo',finicio:'01/05/2025',ftermino:'06/05/2025',costo:10000,abonado:200,saldo:9800,estado:'⚠ Abonando',obs:'Completado'},
    {id:'T-002',exp:'P-002',paciente:'LÓPEZ VEGA CARLOS ALBERTO',tratamiento:'Resina',desc:'Clase II premolar',finicio:'06/05/2025',ftermino:'',costo:2200,abonado:1000,saldo:1200,estado:'⚠ Abonando',obs:'Abono inicial'},
    {id:'T-003',exp:'P-003',paciente:'HERNÁNDEZ RUIZ MARÍA GUADALUPE',tratamiento:'Corona',desc:'Porcelana molar superior',finicio:'15/04/2025',ftermino:'',costo:12000,abonado:6000,saldo:6000,estado:'⚠ Abonando',obs:'50% anticipo'},
    {id:'T-004',exp:'P-004',paciente:'RAMÍREZ TORRES JOSÉ ANTONIO',tratamiento:'Limpieza',desc:'Profilaxis + fluoruro',finicio:'04/05/2025',ftermino:'04/05/2025',costo:650,abonado:650,saldo:0,estado:'✅ Liquidado',obs:'Pago contado'},
    {id:'T-005',exp:'P-005',paciente:'FLORES DÍAZ ANA SOFÍA',tratamiento:'Poste',desc:'Fibra de vidrio',finicio:'05/05/2025',ftermino:'',costo:3800,abonado:93,saldo:3707,estado:'⚠ Abonando',obs:'Pago pendiente'},
  ],
  catalogo: [
    {tratamiento:'Endodoncia',desc:'Tratamiento de conducto radicular completo',min:7000,max:12000,sugerido:9500,vigente:'Sí'},
    {tratamiento:'Resina',desc:'Restauración de composite fotopolimerizable',min:1500,max:3500,sugerido:2500,vigente:'Sí'},
    {tratamiento:'Corona',desc:'Corona de porcelana feldespática / zirconia',min:8000,max:18000,sugerido:13000,vigente:'Sí'},
    {tratamiento:'Poste',desc:'Poste de fibra de vidrio pre-fabricado',min:2500,max:5000,sugerido:3750,vigente:'Sí'},
    {tratamiento:'Limpieza',desc:'Profilaxis dental + aplicación de fluoruro',min:500,max:900,sugerido:700,vigente:'Sí'},
    {tratamiento:'Extracción Simple',desc:'Extracción dental sin complicaciones',min:600,max:1200,sugerido:900,vigente:'Sí'},
    {tratamiento:'Extracción Quirúrgica',desc:'Con elevación de colgajo y/o remoción ósea',min:1500,max:3000,sugerido:2250,vigente:'Sí'},
    {tratamiento:'Blanqueamiento',desc:'Blanqueamiento dental con lámpara LED',min:2500,max:5000,sugerido:3750,vigente:'Sí'},
    {tratamiento:'Implante',desc:'Implante de titanio grado quirúrgico',min:18000,max:30000,sugerido:24000,vigente:'Sí'},
    {tratamiento:'Ortodoncia',desc:'Aparatología fija completa, por mes',min:25000,max:45000,sugerido:35000,vigente:'Sí'},
    {tratamiento:'Placa Nocturna',desc:'Placa oclusal de acrílico',min:1500,max:3000,sugerido:2250,vigente:'Sí'},
    {tratamiento:'Consulta',desc:'Valoración y diagnóstico inicial',min:300,max:500,sugerido:400,vigente:'Sí'},
    {tratamiento:'Radiografía Periapical',desc:'Radiografía periapical unitaria digital',min:100,max:200,sugerido:150,vigente:'Sí'},
    {tratamiento:'Radiografía Panorámica',desc:'Radiografía panorámica (servicio externo)',min:300,max:600,sugerido:450,vigente:'Sí'},
  ],
  abonos: JSON.parse(localStorage.getItem('dental_abonos') || 'null') || [
    {id:'AB-001',idTrat:'T-001',exp:'P-001',paciente:'GARCÍA LÓPEZ MARÍA ELENA',fecha:'01/05/2025',monto:100,forma:'Efectivo',recibo:'R-050',obs:'1er pago'},
    {id:'AB-002',idTrat:'T-003',exp:'P-003',paciente:'HERNÁNDEZ RUIZ MARÍA GUADALUPE',fecha:'15/04/2025',monto:6000,forma:'Transferencia',recibo:'R-051',obs:'50% anticipo'},
    {id:'AB-003',idTrat:'T-001',exp:'P-001',paciente:'GARCÍA LÓPEZ MARÍA ELENA',fecha:'06/05/2025',monto:100,forma:'Tarjeta Crédito',recibo:'R-054',obs:'Pago final'},
    {id:'AB-004',idTrat:'T-002',exp:'P-002',paciente:'LÓPEZ VEGA CARLOS ALBERTO',fecha:'06/05/2025',monto:1000,forma:'Efectivo',recibo:'R-055',obs:'Abono inicial'},
    {id:'AB-005',idTrat:'T-004',exp:'P-004',paciente:'RAMÍREZ TORRES JOSÉ ANTONIO',fecha:'04/05/2025',monto:650,forma:'Efectivo',recibo:'R-056',obs:'Pago total'},
  ],
  citas: JSON.parse(localStorage.getItem('dental_citas') || 'null') || [
    {id:'C-001',exp:'P-001',fecha:'06/05/2025',hora:'09:00',paciente:'GARCÍA LÓPEZ MARÍA ELENA',tel:'5512345678',tratamiento:'Extracción Simple',desc:'Molar inf izq',estado:'No Asistió',obs:'Primera cita',rx:'Sí'},
    {id:'C-002',exp:'P-0200',fecha:new Date().toLocaleDateString('es-MX'),hora:'10:30',paciente:'CHRISTIAN HERNANDEZ SANTIAGO',tel:'58895348',tratamiento:'Extracción Quirúrgica',desc:'Chingo de postes',estado:'Agendado',obs:'Viene en silla de ruedas',rx:'Sí'},
  ],
  save(){
    localStorage.setItem('dental_pacientes',JSON.stringify(this.pacientes));
    localStorage.setItem('dental_tratamientos',JSON.stringify(this.tratamientos));
    localStorage.setItem('dental_abonos',JSON.stringify(this.abonos));
    localStorage.setItem('dental_citas',JSON.stringify(this.citas));
  }
};

function fmtMXN(n){return '$'+Number(n).toLocaleString('es-MX');}
function today(){return new Date().toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'});}
function setActive(page){document.querySelectorAll('.nav-item').forEach(a=>{a.classList.toggle('active',a.dataset.page===page);});}




async function pruebaFirestore() {

  try {

    const docRef = await addDoc(
      collection(db, "pruebas"),
      {
        mensaje: "Hola Firebase",
        fecha: new Date()
      }
    );

    console.log("Documento creado:", docRef.id);

  } catch (error) {

    console.error("Error Firestore:", error);

  }

}

pruebaFirestore();






async function leerPacientes() {

  try {

    const querySnapshot = await getDocs(
      collection(db, "pacientes")
    );

    console.log("LISTA PACIENTES:");

    querySnapshot.forEach((doc) => {

      console.log(doc.id, "=>", doc.data());

    });

  } catch (error) {

    console.error("Error leyendo pacientes:", error);

  }

}

leerPacientes();

