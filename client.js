import http from 'node:http';
import net from 'node:net';
import { WebSocket, WebSocket as WS } from 'ws';
import { relayHost } from './hosts.js';

const REMOTE = process.env.PROXY_URL;
const TOKEN = process.env.PROXY_TOKEN;
const PORT = Number(process.env.LOCAL_PORT || 8888);
const LOG = process.env.PROXY_DEBUG === '1';
if (!REMOTE?.startsWith('wss://') || !TOKEN) throw new Error('Set PROXY_URL=wss://... and PROXY_TOKEN');
const base = new URL(REMOTE);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('Invalid LOCAL_PORT');
const server = http.createServer((_req, res) => { res.writeHead(405); res.end('HTTPS CONNECT proxy only'); });

server.on('connect', (req, client, head) => {
  // Browsers can use this as a global proxy: unrelated HTTPS destinations go DIRECT.
  const match = /^([a-zA-Z0-9.-]+):(\d+)$/.exec(req.url || '');
  if (!match) { client.end('HTTP/1.1 400 Bad Request\r\n\r\n'); return; }
  const host = match[1].toLowerCase().replace(/\.$/, '');
  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) { client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
  if (!relayHost(host)) {
    const upstream = net.connect({host, port});
    upstream.setTimeout(120000);
    let ready = false;
    upstream.on('connect', () => {
      ready = true;
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      client.pipe(upstream); upstream.pipe(client);
      if (LOG) console.log(`DIRECT ${host}:${port}`);
    });
    upstream.on('error', () => { if (!ready) client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); else client.destroy(); });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('close', () => client.destroy());
    client.on('error', () => upstream.destroy());
    client.on('close', () => upstream.destroy());
    return;
  }
  if (port !== 443) { client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
  const url = new URL(base);
  url.pathname = '/tunnel'; url.search = '';
  url.searchParams.set('host', host);
  url.searchParams.set('port', '443');
  const ws = new WebSocket(url, { headers:{'x-proxy-token':TOKEN}, perMessageDeflate:false, handshakeTimeout:20000 });
  let ready = false;
  let settled = false;
  const fail = () => {
    if (settled) return;
    settled = true;
    if (!ready && !client.destroyed) client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    else client.destroy();
  };
  ws.on('message', (data, isBinary) => {
    if (!ready) {
      if (!isBinary && data.toString() === 'READY') {
        ready = true;
        if (LOG) console.log(`RELAY ${host}:443`);
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) ws.send(head, {binary:true});
      } else fail();
      return;
    }
    if (isBinary && !client.destroyed) {
      if (!client.write(data)) ws._socket?.pause();
    }
  });
  client.on('drain', () => ws._socket?.resume());
  client.on('data', chunk => {
    if (!ready || ws.readyState !== WS.OPEN) return;
    if (ws.bufferedAmount > 4*1024*1024) client.pause();
    ws.send(chunk, {binary:true}, err => { if (err) fail(); else client.resume(); });
  });
  client.on('close', () => ws.close());
  client.on('error', () => ws.close());
  ws.on('error', fail);
  ws.on('close', fail);
});
server.listen(PORT, '127.0.0.1', () => console.log(`Proxy at http://127.0.0.1:${PORT} (Google -> Koyeb, other HTTPS -> DIRECT)`));
