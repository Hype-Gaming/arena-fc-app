const WebSocket = require('ws');
const ws = new WebSocket(process.argv[2]);
let id = 0;
const send = (method, params) => new Promise((res) => {
  const mid = ++id;
  const h = (m) => { const o = JSON.parse(m); if (o.id === mid) { ws.off('message', h); res(o.result); } };
  ws.on('message', h);
  ws.send(JSON.stringify({ id: mid, method, params }));
});
const expr = `(() => {
  const vw = document.documentElement.clientWidth;
  const wide = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.width > vw + 1) {
      wide.push({ tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().slice(0,45), w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) });
    }
  });
  return JSON.stringify({ vw, scrollW: document.documentElement.scrollWidth, wide: wide.slice(0, 20) });
})()`;
ws.on('open', async () => {
  await send('Runtime.enable');
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log(JSON.stringify(JSON.parse(r.result.value), null, 1));
  ws.close();
});
ws.on('error', (e) => { console.error('WS ERR', e.message); process.exit(1); });
