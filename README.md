# Gemini Koyeb Proxy v3

HTTPS CONNECT local proxy + authenticated WebSocket Secure (WSS) relay. This is **not** a VPN and cannot guarantee Gemini or Antigravity works in every region. Requires a running remote service that hosts **this** `server.js` (not an arbitrary URL).

## Changes from v2

- `*.clients6.google.com` **and** `clients6.google.com` now use the remote relay, including `geminiweb-pa.clients6.google.com`, `signaler-pa.clients6.google.com`, `wa-pa.clients6.google.com`, and other subdomains.
- Exact/suffix rules in `hosts.js` and Firefox `gemini.pac` agree; new tests check their agreement.
- Unrelated HTTPS destinations are DIRECT (when using the local proxy globally); HTTP is **not supported** by the local CONNECT-only proxy. PAC is recommended for browsers.
- For Google destinations, tunnel failure does not silently fall back to direct.

## 1. Deploy server (Koyeb)

1. Upload **all project files** to the `main` branch of a GitHub repository.
2. Koyeb: create a **Web Service** from GitHub, select the Dockerfile builder and your repo/`main` branch, expose **HTTP port 8000** on `/`.
3. Set an environment secret called `PROXY_TOKEN` with the output of `openssl rand -hex 32`. **Never commit this value to GitHub or share it in screenshots/logs.**
4. Deploy. Open `https://YOUR-REAL-SERVICE-URL/health` — it must return `ok`. Configure `PROXY_URL` below with the **same domain** as the working `/health`, but using `wss://` and `/tunnel`.
5. Redeploy the service when upgrading from v2 because the server uses the same updated destination allowlist as the client.

## 2. Run local client (Linux)

Install Node.js >=20, then:

```bash
npm install
export PROXY_URL='wss://YOUR-REAL-SERVICE-URL/tunnel'
export PROXY_TOKEN='SAME_SECRET_AS_KOYEB'
PROXY_DEBUG=1 npm run client
```

Expected: `Proxy at http://127.0.0.1:8888 ...` (this confirms the local listener only, **not** the remote connection). The server is accessed when a target connection is requested.

**Important:** If you previously published your token in a chat, screenshot or shell log shared online, rotate it in both environments before using this version.

## 3. Test correct routing

In another terminal:

```bash
curl -v --max-time 25 -x http://127.0.0.1:8888 https://geminiweb-pa.clients6.google.com/ -o /dev/null
curl -v --max-time 25 -x http://127.0.0.1:8888 https://signaler-pa.clients6.google.com/ -o /dev/null
curl -v --max-time 25 -x http://127.0.0.1:8888 https://example.org/ -o /dev/null
npm test
```

Local debug should show `RELAY ...clients6.google.com:443` for the first two and `DIRECT example.org:443` for the third. `HTTP/1.1 200 Connection Established` means CONNECT was established; it **does not** guarantee the upstream Google API request was accepted. `HTTP 403/404` from Google can be normal for bare `/` paths. Inspect the curl TLS handshake and distinguish CONNECT status from origin status.

## 4. Firefox (PAC recommended)

From the project folder, run:

```bash
python3 -m http.server 8890 --bind 127.0.0.1
```

Firefox > Settings > Network Settings > Automatic proxy configuration URL:

`http://127.0.0.1:8890/gemini.pac`

Reload the PAC configuration (or restart Firefox) to clear old cached rules. Keep both the PAC HTTP server and `npm run client` running. Note that `gemini.pac` is designed for **HTTPS Gemini traffic** only.

## 5. Antigravity

Test launching it from the same shell after the client starts:

```bash
export HTTP_PROXY='http://127.0.0.1:8888'
export HTTPS_PROXY='http://127.0.0.1:8888'
export http_proxy="$HTTP_PROXY"
export https_proxy="$HTTPS_PROXY"
antigravity
```

The executable name may differ. Antigravity may ignore proxy environment variables for certain services or use application-specific proxy settings. If no `RELAY` lines appear while Antigravity is active, verify its actual proxy configuration before changing the domain list. No UDP/QUIC, TUN, full VPN or system-wide interception is provided.

## Security and limitations

- Remote server accepts only port 443 and restricted Google hostnames, requires a secret token, and does not decrypt HTTPS content.
- Local proxy listens only on `127.0.0.1`.
- No claim of end-to-end live validation on Koyeb is made. Koyeb free instance and Google may close connections or enforce regional/account checks.
- Network logs can expose Google service names; avoid sharing session cookies, full request URLs, or API tokens.
- `clients6.google.com` matches **all** its subdomains but **does not** match lookalikes such as `fakeclients6.google.com`.
