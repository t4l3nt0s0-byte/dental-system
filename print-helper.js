/**
 * print-helper.js — Hersantych Dental
 * Impresión universal sin ventanas emergentes
 * Funciona en Chrome, Edge, Safari, Firefox
 * Extrae CSS dinámicamente de la página para conservar el diseño exacto
 */

// ── EXTRAE CSS COMPLETO DE LA PÁGINA ACTUAL ──────────────────────────
function getPageCSS() {
  const sheets = [...document.styleSheets];
  return sheets.map(ss => {
    try { return [...ss.cssRules].map(r => r.cssText).join('\n'); }
    catch(e) { return ''; }
  }).join('\n');
}

// ── CSS BASE QUE SE AGREGA SIEMPRE ───────────────────────────────────
const PRINT_BASE = `
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  @page { margin: 8mm; }
  body { background: #fff !important; margin: 0; padding: 0; }
`;

// ── MOTOR PRINCIPAL DE IMPRESIÓN ──────────────────────────────────────
function printHTML(html, title, extraCSS) {
  // Remover iframe anterior
  const old = document.getElementById('_print_frame');
  if (old) old.remove();

  // Combinar: CSS de la página + CSS base + CSS específico del módulo
  const fullCSS = getPageCSS() + PRINT_BASE + (extraCSS || '');

  // Crear iframe invisible
  const iframe = document.createElement('iframe');
  iframe.id = '_print_frame';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Hersantych Dental'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${fullCSS}</style>
</head>
<body>${html}</body>
</html>`);
  doc.close();

  // Esperar fonts antes de imprimir
  iframe.onload = function() {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch(e) {
        window.print();
      }
      setTimeout(() => { if (iframe.parentNode) iframe.remove(); }, 3000);
    }, 600); // dar tiempo a que carguen los fonts
  };
}

// ── FUNCIÓN AUXILIAR: oculta todo menos el elemento a imprimir ────────
function printElement(elementId) {
  const el = document.getElementById(elementId);
  if (!el) { if(window.showToast) showToast('Elemento no encontrado','error'); return; }
  const style = document.createElement('style');
  style.id = '_pstyle';
  style.textContent = `@media print{body>*{display:none!important}#${elementId}{display:block!important;position:static!important}.sidebar,.topbar,.hamburger{display:none!important}.main{margin-left:0!important}}`;
  document.head.appendChild(style);
  window.print();
  setTimeout(() => { const s=document.getElementById('_pstyle'); if(s) s.remove(); }, 1000);
}

// ════════════════════════════════════════════════════════════════════
// FUNCIONES ESPECÍFICAS POR MÓDULO
// ════════════════════════════════════════════════════════════════════

/** 🧾 Recibo de pago */
function imprimirRecibo() {
  const el = document.getElementById('reciboPreview');
  if (!el) { showToast('No hay recibo para imprimir','error'); return; }
  printHTML(el.outerHTML, 'Recibo de Pago · Hersantych Dental', `
    body { display:flex; justify-content:center; padding:20px; }
    .recibo { max-width:440px; width:100%; box-shadow:none !important; }
    .recibo-actions { display:none !important; }
    .recibo-header  { background:linear-gradient(135deg,#060D14,#0C1622) !important; }
    .recibo-badge   { background:rgba(0,194,168,.2) !important; color:#00C2A8 !important; }
    .recibo-clinic  { color:#00C2A8 !important; }
    .recibo-total-box { background:#f8fffe !important; border:2px solid #00C2A8 !important; }
    .recibo-forma   { background:#f0fffe !important; color:#00856e !important; border:1px solid rgba(0,194,168,.3) !important; }
    .recibo-footer  { background:#f8f9fa !important; }
  `);
  showToast('Enviando a imprimir...','info');
}

/** 📝 Cotización */
function imprimirCot() {
  const el = document.getElementById('previewCard');
  if (!el) { showToast('No hay cotización para imprimir','error'); return; }
  printHTML(el.outerHTML, 'Cotización · Hersantych Dental', `
    body { display:flex; justify-content:center; padding:20px; }
    .preview-card { max-width:620px; width:100%; box-shadow:none !important; }
    .preview-actions { display:none !important; }
    .preview-header { background:linear-gradient(135deg,#060D14,#0C1622) !important; }
    .preview-clinic { color:#00C2A8 !important; }
    .preview-footer { background:#f8f9fa !important; }
    .preview-validity { background:#fffbf0 !important; border:1px solid rgba(244,185,66,.3) !important; color:#b8860b !important; }
    .preview-total-row.grand span:last-child { color:#00C2A8 !important; }
    .preview-items th { background:#f5f7fa !important; }
    .preview-items td:last-child { color:#111 !important; font-weight:600; }
  `);
  showToast('Enviando a imprimir...','info');
}

/** 🧾 Corte de caja (ticket) */
function printTicket() {
  const el = document.getElementById('ticketPreview');
  if (!el) { showToast('No hay corte para imprimir','error'); return; }
  printHTML(el.outerHTML, 'Corte de Caja · Hersantych Dental', `
    body { display:flex; justify-content:center; padding:20px; }
    .ticket { max-width:340px; width:100%; }
    .ticket-header { background:#060D14 !important; }
    .ticket-clinic { color:#00C2A8 !important; font-family:'Instrument Serif',serif; font-style:italic; }
    .ticket-row.total span:last-child { color:#00C2A8 !important; }
    .ticket-footer { background:#f5f5f5 !important; }
    .ticket-sep { border-top:2px dashed #ddd !important; }
  `);
  showToast('Enviando a imprimir...','info');
}

/** 📄 Estado de cuenta */
function imprimirEdo() {
  const el = document.getElementById('edoCard');
  if (!el) { showToast('Selecciona un paciente primero','error'); return; }
  const pxNombre = window.selectedPx?.nombre || 'Paciente';
  printHTML(el.outerHTML, `Estado de Cuenta · ${pxNombre}`, `
    body { display:flex; justify-content:center; padding:20px; }
    .edo-card { max-width:680px; width:100%; box-shadow:none !important; }
    .edo-header  { background:linear-gradient(135deg,#060D14,#0C1622) !important; }
    .edo-clinic  { color:#00C2A8 !important; font-family:'Instrument Serif',serif; font-style:italic; }
    .edo-clinic-sub { color:rgba(255,255,255,.4) !important; }
    .edo-title-bar  { background:#00C2A8 !important; color:#060D14 !important; }
    .edo-kpis { display:grid !important; grid-template-columns:repeat(3,1fr) !important; gap:8px !important; }
    .edo-kpi  { background:#f8f9fa !important; border:1px solid #eee !important; border-radius:6px !important; padding:10px !important; text-align:center !important; }
    .edo-table th { background:#f5f7fa !important; }
    .edo-table td { border-bottom:1px solid #f0f0f0 !important; }
    .edo-badge-green { background:#dcfce7 !important; color:#16a34a !important; }
    .edo-badge-gold  { background:#fef3c7 !important; color:#d97706 !important; }
    .edo-badge-red   { background:#fee2e2 !important; color:#dc2626 !important; }
    .edo-saldo-box   { background:linear-gradient(135deg,#f8fffe,#f0fffb) !important; border:2px solid #00C2A8 !important; }
    .edo-saldo-grand.liquidado span:last-child { color:#16a34a !important; }
    .edo-saldo-grand.pendiente span:last-child { color:#dc2626 !important; }
    .edo-footer { background:#f8f9fa !important; }
  `);
  showToast('Enviando a imprimir...','info');
}

/** 🦷 Odontograma */
function printOdo() {
  const el = document.querySelector('.odo-wrap');
  if (!el) { showToast('No hay odontograma para imprimir','error'); return; }
  const notas    = document.getElementById('odoNotas')?.textContent || '';
  const pxNombre = document.getElementById('odoSub')?.textContent || '';
  const header   = `
    <div style="margin-bottom:16px">
      <h2 style="font-family:'Instrument Serif',serif;font-style:italic;color:#111;margin-bottom:4px">Odontograma · Hersantych Dental</h2>
      <p style="font-size:.78rem;color:#666">${pxNombre} · ${new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}</p>
    </div>`;
  const notasHtml = notas
    ? `<div style="margin-top:16px;padding:12px;background:#f8f9fa;border-radius:6px;font-size:.78rem;color:#555;border:1px solid #eee"><strong>Notas:</strong> ${notas}</div>`
    : '';
  printHTML(header + el.outerHTML + notasHtml, 'Odontograma · Hersantych Dental', `
    body { padding:24px; }
    .odo-wrap { background:#fff !important; border:none !important; box-shadow:none !important; padding:0 !important; }
    .odo-title, .odo-sub, .btn, .panel-title, .toolLegend, [class*="legend"] { display:none !important; }
    .teeth-row { display:flex !important; justify-content:center !important; gap:3px !important; margin-bottom:4px !important; }
    .tooth { width:38px !important; display:flex !important; flex-direction:column !important; align-items:center !important; gap:2px !important; padding:4px 2px !important; border-radius:6px !important; }
    .tooth-num { font-size:.5rem !important; color:#999 !important; }
    .tooth-svg { width:28px !important; height:32px !important; }
    .s-caries    { background:rgba(255,92,92,.4)  !important; outline:1px solid #FF5C5C !important; }
    .s-obturado  { background:rgba(0,194,168,.4)  !important; outline:1px solid #00C2A8 !important; }
    .s-corona    { background:rgba(244,185,66,.4)  !important; outline:1px solid #F4B942 !important; }
    .s-ausente   { background:rgba(74,158,255,.3)  !important; outline:1px solid #4A9EFF !important; }
    .s-implante  { background:rgba(52,211,153,.4)  !important; outline:1px solid #34D399 !important; }
    .s-endodoncia{ background:rgba(255,154,60,.4)  !important; outline:1px solid #FF9A3C !important; }
  `);
  showToast('Enviando a imprimir...','info');
}

/** 📊 Reporte */
function imprimirReporte() {
  const content = document.getElementById('previewContent');
  const title   = document.getElementById('previewTitle')?.textContent || 'Reporte';
  if (!content || !content.innerHTML.trim()) { showToast('Genera un reporte primero','error'); return; }
  const header = `<h1 style="font-family:'Instrument Serif',serif;font-style:italic;color:#111;margin-bottom:16px">${title}</h1>`;
  printHTML(header + content.innerHTML, title, `
    body { padding:24px; font-family:'DM Sans',sans-serif; color:#111; }
    table { width:100% !important; border-collapse:collapse !important; }
    th { background:#f5f7fa !important; padding:8px 12px !important; font-size:.65rem !important; font-weight:700 !important; letter-spacing:.1em !important; text-transform:uppercase !important; color:#666 !important; text-align:left !important; border-bottom:2px solid #e2e8f0 !important; }
    td { padding:9px 12px !important; border-bottom:1px solid #eee !important; color:#333 !important; }
    .kpi-card { background:#f5f7fa !important; border:1px solid #e2e8f0 !important; border-radius:8px !important; padding:14px !important; display:inline-block !important; margin:0 8px 8px 0 !important; }
    .badge-green  { background:#dcfce7 !important; color:#16a34a !important; }
    .badge-gold   { background:#fef3c7 !important; color:#d97706 !important; }
    .badge-red    { background:#fee2e2 !important; color:#dc2626 !important; }
    .badge-teal   { background:#ccfbf1 !important; color:#0d9488 !important; }
    .badge-blue   { background:#dbeafe !important; color:#2563eb !important; }
    .badge-purple { background:#ede9fe !important; color:#7c3aed !important; }
  `);
  showToast('Enviando a imprimir...','info');
}

// ── Exponer funciones globalmente ─────────────────────────────────────
window.printHTML        = printHTML;
window.printElement     = printElement;
window.getPageCSS       = getPageCSS;
window.imprimirRecibo   = imprimirRecibo;
window.imprimirCot      = imprimirCot;
window.printTicket      = printTicket;
window.imprimirEdo      = imprimirEdo;
window.printOdo         = printOdo;
window.imprimirReporte  = imprimirReporte;
