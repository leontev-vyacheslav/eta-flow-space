## Project  wiki

### 1. I got an error like that:

```shell
Error: EACCES: permission denied, copyfile '/usr/src/node-red/node_modules/node-red/settings.js' -> '/data/settings.js'
```

Inside the Node-RED Docker image:

- Node-RED runs as user node-red (UID 1000), not root (for security).

- On your host, the ./data directory is probably owned by root or another user.

- When the container tries to copy the default settings.js into /data, it gets permission denied.

You can solve this in one of three ways, depending on your preference:

```shell
sudo chown -R 1000:1000 ./data
```

### 2. HTTPS on port 3000 (https://eta24.ru:3000)

Only port 3000 is forwarded by the office router, and ports 80/443 belong to the IIS server (old dispatching
system). That server already gets a Let's Encrypt certificate for `eta24.ru` from win-acme; the gateway reuses it
(a certificate is not tied to a port).

```
IIS server (win-acme, scheduled task)            Linux machine (docker compose)
 renews eta24.ru, installs it in IIS              sync-cert.sh (host cron, daily): scp the PEM files,
 + exports PEM files to C:\certs\eta24  <-- SSH -- check them, copy to ./certs, reload the gateway
```

**IIS server (done once):** the eta24.ru renewal has two store steps: *Windows Certificate Store (WebHosting)* for
IIS and *PEM encoded files* to `C:\certs\eta24` without a key password. The folder is readable only by SYSTEM,
Administrators and the SSH user (PowerShell as administrator; the quotes stop PowerShell reading `(OI)` as a command):

```powershell
icacls C:\certs\eta24 /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' 'eta-leo:(OI)(CI)R'
icacls C:\certs\eta24\* /reset
```

**Linux machine, switching over** (in this order: nginx does not start without the certificate files):

```shell
cp sync-cert.env.example sync-cert.env   # fill in the IIS server address, SSH user, folder
./sync-cert.sh                           # first run fills ./certs; expect "certificate installed"
docker compose up -d --build eta-flow-space-ui eta-flow-space-gateway
crontab -e                               # add: 30 15 * * * /path/to/eta-flow-space/sync-cert.sh >> /path/to/eta-flow-space/sync-cert.log 2>&1
```

Check: `https://eta24.ru:3000` opens with a valid certificate, and `http://eta24.ru:3000` redirects to it.
The first `./sync-cert.sh` run also shows whether `scp` accepts the Windows path; if not, try
`CERT_SOURCE_DIR=/C:/certs/eta24`.

`sync-cert.sh` only installs a certificate that is valid, not expired, for `eta24.ru` and matching its key;
otherwise it logs an error and keeps the current one. If the gateway rejects new files, the previous ones are restored.

**Local development:** the gateway also listens on plain HTTP port 8080, published only on the machine's
`127.0.0.1:3080` (not forwarded by the router). The developer SSH tunnel maps the dev UI's `localhost:3002` to it:
`-L 3002:localhost:3080` (the HTTPS port 3000 would only answer with redirects to https).

**Content-Security-Policy:** the gateway sends an enforced `Content-Security-Policy` (see `nginx.conf`): scripts only
from this site (no `eval`, no inline or foreign scripts), images from here and the OpenStreetMap tile servers, fonts
from here. Anything else is blocked, and the DevTools console shows "Refused to …". A new external source (another
tile server, a CDN) must be added to the matching directive first. To investigate a problem without blocking,
rename the header to `Content-Security-Policy-Report-Only` for a while (console messages then start with
"[Report Only]"), then back.

**After changing `nginx.conf`:** run `docker compose up -d --force-recreate eta-flow-space-gateway`. The file is
bind-mounted on its own, and `git pull` replaces it with a new file, so a restarted container can keep serving the
old one. Check with `docker exec eta-flow-space-gateway nginx -T | grep Content-Security`.

**Recreating the UI, web API or reporting container** needs nothing on the gateway: it looks the container names up
through Docker's DNS (`resolver 127.0.0.11 valid=10s`), so it finds a recreated container's new address by itself,
within about 10 seconds (requests in that window can get 502). It also starts while one of those containers is down;
only that container's routes answer 502 until it is back.

**Rollback:** `git checkout <previous commit> -- nginx.conf docker-compose.yaml` and
`docker compose up -d eta-flow-space-gateway` bring back plain HTTP on 3000 (the UI build works with both).

### 3. Reports in the local dev UI

The dev UI (`npm run dev`) talks to production through the SSH tunnel on `localhost:3002`, reports included
(`/api/reporting` behind the gateway), so they work without running anything else locally.

To work on the reports themselves, run `flow-space-reporting` locally
(`.venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000`) and point the dev UI at it with
`flow-space-ui/.env.development.local` (not committed):

```shell
VITE_REPORTING_HOST=http://localhost:8000/api
```

Restart `npm run dev` after creating or removing that file.

### 4. Database schema

The schema is versioned in `database/schema.sql` (tables, indexes, the `cleanup()` retention procedure); the web API's
models no longer create tables. A fresh install gets it automatically; schema changes go through
`database/migrations/` and a refreshed `schema.sql` — see `database/README.md`.
