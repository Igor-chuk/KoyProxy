# Gemini Koyeb Proxy

An authenticated, destination-restricted HTTPS CONNECT tunnel over WSS. Node.js 20+.

## Koyeb deployment
1. Push `package.json`, `server.js`, `client.js`, and `Dockerfile` to a **private** GitHub repository (or a public repo without secrets).
2. Koyeb > Create Web Service > GitHub > Dockerfile; choose the **Free** instance, Frankfurt or Washington.
3. Expose port `8000` as **HTTP**; route `/` to it. Set environment variable `PROXY_TOKEN` to a random 32+ character secret, e.g. `openssl rand -hex 32`.
4. Deploy; open `https://YOUR-APP.koyeb.app/health` and expect `ok`.

## Local client (Linux)
```bash
npm install
export PROXY_URL='wss://YOUR-APP.koyeb.app/tunnel'
export PROXY_TOKEN='SAME_SECRET_AS_KOYEB'
npm run client
```

### Firefox
Settings > Network Settings > Manual proxy configuration: HTTP Proxy `127.0.0.1`, Port `8888`; tick **Also use this proxy for HTTPS**. Other websites will be rejected; use a separate Firefox profile for Gemini or a PAC configuration for selective routing.

### curl API test
```bash
export GEMINI_API_KEY='YOUR_API_KEY'
curl -x http://127.0.0.1:8888 -H "x-goog-api-key: $GEMINI_API_KEY" 'https://generativelanguage.googleapis.com/v1beta/models'
```

### Selective Firefox PAC file
Create `gemini.pac`:
```js
function FindProxyForURL(url, host) {
  if (host === 'gemini.google.com' || host === 'aistudio.google.com' || host === 'generativelanguage.googleapis.com' || host === 'accounts.google.com' || host === 'www.google.com' || host === 'ogs.google.com' || host === 'ssl.gstatic.com' || host === 'www.gstatic.com' || host === 'fonts.gstatic.com' || host === 'fonts.googleapis.com' || host === 'lh3.googleusercontent.com' || host === 'play.google.com' || host === 'apis.google.com' || host === 'content.googleapis.com' || host === 'people.googleapis.com' || host === 'oauth2.googleapis.com' || dnsDomainIs(host, '.googleusercontent.com') || dnsDomainIs(host, '.gstatic.com')) return 'PROXY 127.0.0.1:8888';
  return 'DIRECT';
}
```
Host the PAC file locally via `python3 -m http.server 8890 --bind 127.0.0.1` in its directory, then set Firefox Automatic proxy configuration URL to `http://127.0.0.1:8890/gemini.pac`. Note that this routes shared Google login domains through Koyeb too.

## Notes
- Free instances sleep after one hour idle; cold starts and WebSocket interruptions are possible.
- This tunnels TCP/443 only; UDP/QUIC and direct DNS are not tunneled. Disable HTTP/3 in Firefox if needed (`about:config` > `network.http.http3.enable` = false).
- A Gemini login may use additional Google domains not in the allowlist. Extend the allowlist in BOTH JS files if necessary.
- Koyeb IP address is a data center IP and might be blocked by Google; this does not guarantee access.
- Some SDKs ignore `HTTPS_PROXY`; verify your specific SDK/IDE supports HTTP CONNECT proxying.
- Do not commit tokens or API keys. HTTPS remains end-to-end between client and Google; Koyeb handles encrypted TCP bytes, not decrypted request contents.
