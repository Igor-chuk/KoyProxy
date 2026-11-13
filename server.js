import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 8000);
const TOKEN = process.env.PROXY_TOKEN;
if (!TOKEN || Buffer.byteLength(TOKEN) < 32) throw new Error('Set PROXY_TOKEN (at least 32 bytes)');
const allowed = (host) => host === 'gemini.google.com' || host === 'aistudio.google.com' || host === 'generativelanguage.googleapis.com' || host === 'accounts.google.com' || host === 'www.google.com' || host === 'ogs.google.com' || host === 'ssl.gstatic.com' || host === 'www.gstatic.com' || host === 'fonts.gstatic.com' || host === 'fonts.googleapis.com' || host === 'lh3.googleusercontent.com' || host === 'play.google.com' || host === 'apis.google.com' || host === 'content.googleapis.com' || host === 'people.googleapis.com' || host === 'oauth2.googleapis.com' || host.endsWith('.googleusercontent.com') || host.endsWith('.gstatic.com');
const server = http.createServer((req,res) => { res.writeHead(req.url === '/health' ? 200 : 404, {'content-type':'text/plain'}); res.end(req.url === '/health' ? 'ok' : 'not found'); });
const wss = new WebSocketServer({noServer:true, maxPayload:1024*1024, perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
  const supplied = req.headers['x-proxy-token'];
  const a = Buffer.from(typeof supplied === 'string' ? supplied : '');
  const b = Buffer.from(TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) {socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); socket.destroy(); return;}
  let url;
  try {url = new URL(req.url, 'http://localhost');} catch {socket.destroy();return;}
  const host = url.searchParams.get('host');
  if (url.pathname !== '/tunnel' || !host || !allowed(host) || url.searchParams.get('port') !== '443') {socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,host));
});
wss.on('connection',(ws,host)=>{
  const upstream = net.connect({host,port:443});
  let connected=false;
  upstream.setTimeout(120000);
  upstream.on('connect',()=>{connected=true;ws.send('READY');});
  upstream.on('data',chunk=>{if(ws.readyState===WebSocket.OPEN) {if(ws.bufferedAmount>4*1024*1024) upstream.pause(); ws.send(chunk,{binary:true},()=>upstream.resume());}});
  ws.on('message',(data,isBinary)=>{if(isBinary && connected && !upstream.destroyed) {if(!upstream.write(data)) ws._socket?.pause();}});
  upstream.on('drain',()=>ws._socket?.resume());
  upstream.on('error',()=>ws.close(1011,'upstream error'));
  upstream.on('timeout',()=>upstream.destroy());
  upstream.on('close',()=>ws.close());
  ws.on('close',()=>upstream.destroy());
  ws.on('error',()=>upstream.destroy());
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Relay listening on ${PORT}`));
