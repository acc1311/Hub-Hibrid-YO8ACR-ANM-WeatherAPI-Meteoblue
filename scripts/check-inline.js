import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync('index.html','utf8');
const re = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
let m, idx=0, errors=0;
while((m=re.exec(html))){
  idx++;
  const code=m[1];
  if(!code.trim()) continue;
  if(code.includes('import ') && code.includes('from ')) continue; // ESM
  try{ new vm.Script(code, { filename:`index.html:inline#${idx}`}); }
  catch(e){ console.error(`✗ Inline script #${idx} syntax error: ${e.message}`); errors++; }
}
if(errors) { console.error(`\n${errors} inline script(s) failed syntax check`); process.exit(1); }
console.log(`✓ Checked ${idx} inline script(s) — syntax OK`);
