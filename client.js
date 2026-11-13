import http from 'node:http';
import { WebSocket, WebSocket as WS } from 'ws';
const REMOTE = process.env.PROXY_URL;
const TOKEN = process.env.PROXY_TOKEN;
const PORT = Number(process.env.LOCAL_PORT || 8888);
if(!REMOTE?.startsWith('wss://') || !TOKEN) throw new Error('Set PROXY_URL=wss://... and PROXY_TOKEN');
const allowed = host => host === 'gemini.google.com' || host === 'aistudio.google.com' || host === 'generativelanguage.googleapis.com' || host === 'accounts.google.com' || host === 'www.google.com' || host === 'ogs.google.com' || host === 'ssl.gstatic.com' || host === 'www.gstatic.com' || host === 'fonts.gstatic.com' || host === 'fonts.googleapis.com' || host === 'lh3.googleusercontent.com' || host === 'play.google.com' || host === 'apis.google.com' || host === 'content.googleapis.com' || host === 'people.googleapis.com' || host === 'oauth2.googleapis.com' || host.endsWith('.googleusercontent.com') || host.endsWith('.gstatic.com');
const server = http.createServer((req,res)=>{res.writeHead(405);res.end('CONNECT only');});
server.on('connect',(req,socket,head)=>{
  const match=/^([a-zA-Z0-9.-]+):(\d+)$/.exec(req.url || '');
  if(!match || match[2]!=='443' || !allowed(match[1].toLowerCase())) {socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
  const host=match[1].toLowerCase();
  const url=new URL(REMOTE);
  url.pathname='/tunnel';url.search='';url.searchParams.set('host',host);url.searchParams.set('port','443');
  const ws=new WebSocket(url,{headers:{'x-proxy-token':TOKEN},perMessageDeflate:false,handshakeTimeout:15000});
  let ready=false;
  const fail=()=>{if(!ready && !socket.destroyed) socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');else socket.destroy();};
  ws.on('message',(data,isBinary)=>{
    if(!ready){if(!isBinary && data.toString()==='READY') {ready=true;socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)ws.send(head,{binary:true});}else fail();return;}
    if(isBinary && !socket.destroyed){if(!socket.write(data)) ws._socket?.pause();}
  });
  socket.on('drain',()=>ws._socket?.resume());
  socket.on('data',chunk=>{if(ready && ws.readyState===WS.OPEN){if(ws.bufferedAmount>4*1024*1024)socket.pause();ws.send(chunk,{binary:true},()=>socket.resume());}});
  socket.on('close',()=>ws.close());
  socket.on('error',()=>ws.close());
  ws.on('error',fail);
  ws.on('close',()=>{if(!socket.destroyed)fail();});
});
server.listen(PORT,'127.0.0.1',()=>console.log(`Local CONNECT proxy at 127.0.0.1:${PORT}`));
