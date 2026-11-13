import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { relayHost } from './hosts.js';

const PORT = Number(process.env.PORT || 8000);
const TOKEN = process.env.PROXY_TOKEN;
if (!TOKEN || Buffer.byteLength(TOKEN) < 32) throw new Error('PROXY_TOKEN must have >=32 bytes');
const server = http.createServer((req, res) => {
  res.writeHead(req.url === '/health' ? 200 : 404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control':'no-store' });
  res.end(req.url === '/health' ? 'ok' : 'not found');
});
const wss = new WebSocketServer({ noServer:true, maxPayload:2*1024*1024, perMessageDeflate:false });
server.on('upgrade', (req, socket, head) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
  const host = url.searchParams.get('host');
  if (url.pathname !== '/tunnel' || !relayHost(host) || url.searchParams.get('port') !== '443') {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
  }
  const supplied = req.headers['x-proxy-token'];
  const a = Buffer.from(typeof supplied === 'string' ? supplied : '');
  const b = Buffer.from(TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, host));
});
wss.on('connection', (ws, host) => {
  const upstream = net.connect({host, port:443});
  let connected = false;
  const stop = () => { if (!upstream.destroyed) upstream.destroy(); if (ws.readyState === WebSocket.OPEN) ws.close(); };
  upstream.setTimeout(120000);
  upstream.on('connect', () => {
    connected = true;
    if (ws.readyState === WebSocket.OPEN) ws.send('READY'); else stop();
  });
  upstream.on('data', chunk => {
    if (ws.readyState !== WebSocket.OPEN) { stop(); return; }
    if (ws.bufferedAmount > 4*1024*1024) upstream.pause();
    ws.send(chunk, {binary:true}, err => { if (err) stop(); else if (!upstream.destroyed) upstream.resume(); });
  });
  ws.on('message', (data, isBinary) => {
    if (!isBinary || !connected || upstream.destroyed) return;
    if (!upstream.write(data)) ws._socket?.pause();
  });
  upstream.on('drain', () => ws._socket?.resume());
  upstream.on('error', stop);
  upstream.on('timeout', stop);
  upstream.on('close', () => { if (ws.readyState === WebSocket.OPEN) ws.close(); });
  ws.on('close', () => upstream.destroy());
  ws.on('error', () => upstream.destroy());
});
server.listen(PORT, '0.0.0.0', () => console.log(`Koyeb tunnel listening on ${PORT}`));
