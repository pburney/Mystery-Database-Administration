# Mystery — Deployment Guide

Mystery is designed to run locally or behind a reverse proxy. It binds to `localhost` by default and is not intended to be exposed directly to the internet.

---

## Local Use (Recommended)

The simplest setup: run Mystery on your own machine and point it at a local or remote database. No web hosting required.

```bash
npm start    # Binds to http://localhost:3000
```

Open your browser, log in, done. Your Mystery instance is only accessible from your own machine.

---

## Remote Database, Local Mystery

You can administer a remote MySQL server without deploying Mystery to a server. Run Mystery locally and connect it to the remote database.

**Direct connection** (if the DB port is open to your IP):
```
TARGET_DB=mysql://user:password@db.example.com:3306/myapp
```

**SSH tunnel** (most common — no firewall changes needed):
```bash
# Terminal 1 — keep this open
ssh -L 3307:localhost:3306 your-user@remote-host

# Terminal 2 — Mystery uses the tunnel
TARGET_DB=mysql://user:password@127.0.0.1:3307/myapp
npm start
```

---

## Hosted Deployment (Shared Access)

If multiple people need access, deploy Mystery on a server behind a TLS-terminating reverse proxy.

**Requirements:**
- Node.js 18+ on the server
- Nginx, Caddy, or similar for HTTPS termination
- Mystery must NOT be exposed directly on a public port

### Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name admin.example.com;

    ssl_certificate     /etc/letsencrypt/live/admin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name admin.example.com;
    return 301 https://$host$request_uri;
}
```

### Caddy Configuration

```caddy
admin.example.com {
    reverse_proxy localhost:3000
}
```

Caddy handles TLS automatically via Let's Encrypt.

### Mystery `.env` for Hosted Deployment

```env
TARGET_DB=mysql://user:password@localhost:3306/myapp
CONFIG_DB_PATH=/var/lib/mystery/mystery.db
SESSION_SECRET=<strong random string — see below>
PORT=3000
HTTPS=true
NODE_ENV=production
```

Setting `HTTPS=true`:
- Enables the `Secure` flag on session cookies (cookie only sent over HTTPS)
- Enables Express `trust proxy` so `req.ip` reflects the real client IP (needed for rate limiting and audit logs)

### Generating a Strong SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output as your `SESSION_SECRET`. Keep it out of version control.

---

## Security Checklist

Before putting Mystery on a network:

- [ ] Change the `admin` password immediately after first login
- [ ] Set a strong, random `SESSION_SECRET` (at least 32 random bytes)
- [ ] Use HTTPS — never expose Mystery over plain HTTP on a shared network
- [ ] Set `HTTPS=true` when behind a TLS proxy
- [ ] Firewall Mystery's port (3000) so it is only accessible via the proxy, not directly
- [ ] Keep `mystery.db` outside the web root and back it up regularly
- [ ] Review audit_log periodically: `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100;`
- [ ] Don't share admin credentials — create individual user accounts per person

---

## Process Management

For production deployments, use a process manager to keep Mystery running:

**systemd:**
```ini
[Unit]
Description=Mystery Database Admin
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/mystery/src/server.js
WorkingDirectory=/opt/mystery
EnvironmentFile=/opt/mystery/.env
Restart=on-failure
User=mystery

[Install]
WantedBy=multi-user.target
```

**PM2:**
```bash
pm2 start src/server.js --name mystery
pm2 save
pm2 startup
```

---

## Upgrading

Mystery has no database migrations yet (the config schema uses `CREATE TABLE IF NOT EXISTS`). To upgrade:

1. Pull the latest code
2. `npm install`
3. Restart the server

New tables and columns added in schema.js will be created automatically if they don't exist. Existing tables are not modified, so schema changes that alter column definitions require a manual migration or fresh mystery.db.
