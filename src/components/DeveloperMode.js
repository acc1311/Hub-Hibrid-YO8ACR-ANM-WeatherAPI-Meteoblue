/**
 * src/components/DeveloperMode.js
 * Diagnostics panel — raw, normalized, ranking, weights, confidence, latency, cache, fallback
 */
export function renderDeveloperMode({ raw, normalized, snapshot, health, fusion }){
  return `
  <details class="dev-mode" style="background:var(--grid);border-radius:16px;padding:12px;margin:14px 0;">
    <summary style="font-weight:800;cursor:pointer;">Developer / Diagnostics</summary>
    <pre style="font-size:0.62rem;overflow:auto;max-height:300px;background:var(--card);padding:10px;border-radius:10px;margin-top:8px;">${escapeHtml(JSON.stringify({ raw, normalized, snapshot, health, fusion }, null, 2))}</pre>
  </details>`;
}
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
export default { renderDeveloperMode };
