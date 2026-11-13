# Gemini Koyeb Proxy v2

Selective HTTPS CONNECT proxy with Koyeb relay via WebSocket Secure (WSS).

## Changes in v2
- Adds Antigravity-related `daily-cloudcode-pa.googleapis.com`, `aicode.googleapis.com` and `*.googleapis.com` routing.
- For all unlisted hosts, the **local** proxy connects DIRECT instead of returning 403, so global HTTPS proxy mode doesn't break ordinary HTTPS browsing.
- Includes `gemini.pac` for browser-only selective routing and `PROXY_DEBUG=1` logging of routing decisions (no request contents or tokens).
- Google target traffic fails closed: if Koyeb is unavailable, requests do not fall back to DIRECT.

## Deploy to Koyeb
1. Upload project files to GitHub (do not commit secrets).
2. Koyeb > Web Service > GitHub > Dockerfile, select the Free instance if available.
3. Configure **HTTP port 8000**, route `/`, and `PROXY_TOKEN` (a random secret >=32 bytes, e.g. `openssl rand -hex 32`).
4. Deploy and open `https://YOUR-SERVICE.koyeb.app/health`; expect `ok`.
5. Redeploy is REQUIRED when upgrading from v1; `hosts.js` is now required on the server.

## Linux local client
Install Node.js >=20, then:

```bash
npm install
export PROXY_URL='wss://YOUR-SERVICE.koyeb.app/tunnel'
export PROXY_TOKEN='SAME_SECRET_AS_KOYEB'
export PROXY_DEBUG=1
npm run client
```

### Test API (with your Gemini API key)
```bash
curl -v --max-time 35 -x http://127.0.0.1:8888 https://daily-cloudcode-pa.googleapis.com/ -o /dev/null
curl -v --max-time 35 -x http://127.0.0.1:8888 https://aicode.googleapis.com/ -o /dev/null
curl -v --max-time 35 -x http://127.0.0.1:8888 https://example.org/ -o /dev/null
curl -x http://127.0.0.1:8888 -H "x-goog-api-key: $GEMINI_API_KEY" 'https://generativelanguage.googleapis.com/v1beta/models'
```
`HTTP/1.1 200 Connection Established` means the tunnel worked; Google can still return 401/403/404 for the endpoint itself.

### Firefox
**Recommended:** use PAC rather than setting the whole browser through a proxy. Serve `gemini.pac` with
`python3 -m http.server 8890 --bind 127.0.0.1` from this directory, then set Firefox > Network Settings > Automatic proxy configuration URL:
`http://127.0.0.1:8890/gemini.pac`.

Alternatively, configure an HTTP + HTTPS proxy `127.0.0.1:8888`. Unlisted **HTTPS** sites go direct, but plain HTTP URLs aren't supported by this CONNECT-only proxy; for normal browsing, PAC is preferable.

### Antigravity (separate desktop app)
Some Electron/VS Code-based apps use `HTTP_PROXY`/`HTTPS_PROXY`, but some networking components ignore them. To try launching from a shell:
```bash
export HTTP_PROXY='http://127.0.0.1:8888'
export HTTPS_PROXY='http://127.0.0.1:8888'
export http_proxy="$HTTP_PROXY"
export https_proxy="$HTTPS_PROXY"
# Replace with the installed Antigravity executable, e.g. `antigravity`:
antigravity
```
Do NOT set these vars globally at login until you have verified the app works. The app may need its own proxy settings. If the app cannot use CONNECT correctly, this project alone will not fix it.

## Caveats and security
- No full VPN/TUN, UDP/QUIC or remote DNS for DIRECT destinations. Other HTTPS sites connect from your own IP.
- Koyeb free instance can sleep, close WebSockets or be blocked by Google. Google account/region checks can differ from the UI displayed.
- Koyeb relay only accepts restricted Google domain destinations on port 443; do not change it into an open public relay.
- Local HTTP proxy listens **only on 127.0.0.1**. HTTPS payload stays encrypted end-to-end to the destination.
- If no `RELAY` line appears in `PROXY_DEBUG=1` when using Antigravity, its traffic is not using this local proxy.
