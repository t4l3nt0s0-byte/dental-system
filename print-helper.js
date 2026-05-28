/**
 * print-helper.js — Hersantych Dental
 * Impresión universal sin ventanas emergentes
 * Funciona en Chrome, Edge, Safari, Firefox
 */

/**
 * Imprime contenido HTML usando un iframe invisible
 * No requiere permisos de ventanas emergentes
 * Compatible con Chrome, Edge, Safari, Firefox
 *
 * @param {string} html      — HTML completo a imprimir
 * @param {string} title     — Título del documento
 * @param {string} extraCSS  — CSS adicional opcional
 */
function printHTML(html, title = 'Hersantych Dental', extraCSS = '') {
  // Remover iframe anterior si existe
  const old = document.getElementById('_print_frame');
  if (old) old.remove();

  // CSS base para impresión
  const baseCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; font-family: 'DM Sans', sans-serif; color: #111; }
    @media print {
      @page { margin: 8mm; }
      body { padding: 0; }
    }
    ${extraCSS}
  `;

  // Crear iframe oculto
  const iframe = document.createElement('iframe');
  iframe.id = '_print_frame';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  // Escribir contenido
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${baseCSS}</style>
</head>
<body>${html}</body>
</html>`);
  doc.close();

  // Esperar que carguen fonts e imágenes antes de imprimir
  iframe.onload = function () {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      // Fallback: window.print directo si el iframe falla (Safari antiguo)
      window.print();
    }
    // Limpiar después de imprimir
    setTimeout(() => { if (iframe.parentNode) iframe.remove(); }, 2000);
  };
}

/**
 * Imprime un elemento DOM específico de la página actual
 * Más simple — solo oculta todo lo demás y hace window.print()
 *
 * @param {string} elementId — ID del elemento a imprimir
 * @param {string} extraCSS  — CSS adicional para la impresión
 */
function printElement(elementId, extraCSS = '') {
  const el = document.getElementById(elementId);
  if (!el) { showToast('No se encontró el elemento a imprimir', 'error'); return; }

  // Crear estilos temporales
  const style = document.createElement('style');
  style.id = '_print_style';
  style.textContent = `
    @media print {
      body > * { display: none !important; }
      #${elementId} { display: block !important; position: static !important; }
      .sidebar, .topbar, .hamburger, .main > *:not(#${elementId}),
      .recibo-actions, .preview-actions, .tab-panel:not(.active),
      .tabs, .filters, .content > *:not(.recibo-layout):not(.edo-layout) { display: none !important; }
      .main { margin-left: 0 !important; }
      ${extraCSS}
    }
  `;
  document.head.appendChild(style);

  window.print();

  // Remover estilos temporales
  setTimeout(() => {
    const s = document.getElementById('_print_style');
    if (s) s.remove();
  }, 1000);
}

// ── FUNCIONES ESPECÍFICAS POR MÓDULO ──────────────────────

/**
 * Imprime el recibo de pago
 */
function imprimirRecibo() {
  const preview = document.getElementById('reciboPreview');
  if (!preview) { showToast('No hay recibo para imprimir', 'error'); return; }
  const css = `
    body { display: flex; justify-content: center; padding: 10px; }
    .recibo { max-width: 420px; width: 100%; }
    .recibo-header { background: linear-gradient(135deg,#060D14,#0C1622) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .recibo-badge { background: rgba(0,194,168,.2) !important; color: #00C2A8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .recibo-clinic { color: #00C2A8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .recibo-total-box { background: #f8fffe !important; border: 2px solid #00C2A8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .recibo-firma { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 18px; }
    .firma-box { border-top: 1px solid #ddd; padding-top: 8px; text-align: center; font-size: .65rem; color: #999; }
    .recibo-actions { display: none !important; }
  `;
  printHTML(preview.outerHTML, 'Recibo de Pago · Hersantych Dental', css);
  showToast('Enviando a imprimir...', 'info');
}

/**
 * Imprime la cotización
 */
function imprimirCot() {
  const card = document.getElementById('previewCard');
  if (!card) { showToast('No hay cotización para imprimir', 'error'); return; }
  const css = `
    body { display: flex; justify-content: center; padding: 10px; }
    .preview-card { max-width: 600px; width: 100%; box-shadow: none; }
    .preview-header { background: linear-gradient(135deg,#060D14,#0C1622) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .preview-clinic { color: #00C2A8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .preview-total-row.grand span:last-child { color: #00C2A8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .preview-actions { display: none !important; }
  `;
  printHTML(card.outerHTML, 'Cotización · Hersantych Dental', css);
  showToast('Enviando a imprimir...', 'info');
}

/**
 * Imprime el corte de caja (ticket)
 */
function printTicket() {
  const ticket = document.getElementById('ticketPreview');
  if (!ticket) { showToast('No hay corte para imprimir', 'error'); return; }
  const css = `
    body { display: flex; justify-content: center; padding: 10px; }
    .ticket { max-width: 320px; width: 100%; }
    .ticket-header { background: #060D14 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ticket-clinic { color: #00C2A8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ticket-row.total span:last-child { color: #00C2A8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `;
  printHTML(ticket.outerHTML, 'Corte de Caja · Hersantych Dental', css);
  showToast('Enviando a imprimir...', 'info');
}

/**
 * Imprime el estado de cuenta
 */
function imprimirEdo() {
  const card = document.getElementById('edoCard');
  if (!card) { showToast('Selecciona un paciente primero', 'error'); return; }
  const css = `
    body { display: flex; justify-content: center; padding: 10px; }
    .edo-card { max-width: 620px; width: 100%; }
    .edo-header { background: linear-gradient(135deg,#060D14,#0C1622) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .edo-clinic { color: #00C2A8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .edo-title-bar { background: #00C2A8 !important; color: #060D14 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .edo-kpi { background: #f8f9fa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .edo-saldo-box { background: #f8fffe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .edo-saldo-grand.liquidado span:last-child { color: #16a34a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .edo-saldo-grand.pendiente span:last-child { color: #dc2626 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `;
  printHTML(card.outerHTML, `Estado de Cuenta · ${window.selectedPx?.nombre || 'Paciente'}`, css);
  showToast('Enviando a imprimir...', 'info');
}

/**
 * Imprime el odontograma
 */
function printOdo() {
  const odoEl = document.querySelector('.odo-wrap');
  const notas = document.getElementById('odoNotas')?.textContent || '';
  if (!odoEl) { showToast('No hay odontograma para imprimir', 'error'); return; }
  const pxNombre = document.getElementById('odoSub')?.textContent || '';
  const css = `
    body { padding: 20px; font-family: 'DM Sans', sans-serif; color: #111; }
    h2 { font-family: 'Instrument Serif', serif; font-style: italic; margin-bottom: 4px; }
    .odo-wrap { background: #fff; }
    .teeth-row { display: flex; justify-content: center; gap: 4px; margin-bottom: 4px; }
    .tooth { width: 38px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px; }
    .tooth-num { font-size: .55rem; font-weight: 700; color: #999; line-height: 1; }
    .tooth-svg { width: 28px; height: 32px; }
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  `;
  const header = `<h2>Odontograma · Hersantych Dental</h2><p style="font-size:.8rem;color:#666;margin-bottom:16px">${pxNombre}</p>`;
  const notasHtml = notas ? `<p style="margin-top:16px;font-size:.8rem;color:#666"><strong>Notas:</strong> ${notas}</p>` : '';
  printHTML(header + odoEl.innerHTML + notasHtml, 'Odontograma · Hersantych Dental', css);
  showToast('Enviando a imprimir...', 'info');
}

/**
 * Imprime un reporte
 */
function imprimirReporte() {
  const content = document.getElementById('previewContent');
  const title = document.getElementById('previewTitle')?.textContent || 'Reporte';
  if (!content) { showToast('Genera un reporte primero', 'error'); return; }
  const css = `
    body { padding: 20px; font-family: 'DM Sans', sans-serif; color: #111; }
    h1 { font-family: 'Instrument Serif', serif; font-style: italic; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    th { padding: 8px 12px; background: #f5f7fa !important; border-bottom: 2px solid #e2e8f0; font-size: .65rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #666; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    td { padding: 9px 12px; border-bottom: 1px solid #eee; color: #333; vertical-align: middle; }
    .kpi-card { background: #f5f7fa !important; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; display: inline-block; margin-right: 10px; margin-bottom: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 100px; font-size: .65rem; font-weight: 700; }
    .badge-green { background: #dcfce7 !important; color: #16a34a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge-gold  { background: #fef3c7 !important; color: #d97706 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge-red   { background: #fee2e2 !important; color: #dc2626 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge-teal  { background: #ccfbf1 !important; color: #0d9488 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge-blue  { background: #dbeafe !important; color: #2563eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `;
  const header = `<h1>${title}</h1>`;
  printHTML(header + content.innerHTML, title, css);
  showToast('Enviando a imprimir...', 'info');
}

// Exponer globalmente
window.printHTML     = printHTML;
window.printElement  = printElement;
window.imprimirRecibo = imprimirRecibo;
window.imprimirCot   = imprimirCot;
window.printTicket   = printTicket;
window.imprimirEdo   = imprimirEdo;
window.printOdo      = printOdo;
window.imprimirReporte = imprimirReporte;
