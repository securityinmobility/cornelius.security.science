# learn.security.science

Small demos for security workshops (THI).

- `/passwords/` Behind the Login: how websites store passwords, cracking, 2FA
- `/phinder/` Phinder: phish or legit? Solo, or together in a room (projector + phones)

## Run locally

```
docker compose -f docker-compose.local.yaml up -d
```

Then open http://localhost:8080. Stop with `docker compose -f docker-compose.local.yaml down`.

To try the online mode, create a room in one tab and join with the code in a second tab (or a private window).
Phones in the same network can use `http://<your-ip>:8080/phinder/` (may be blocked by the firewall or the network).

## Run on the server

```
docker compose up -d
```

Needs the external `web` network and Traefik. This starts two containers:

- `learn-cybersecurity`: nginx, serves `html/` and forwards `/api/` to the Phinder server
- `learn-cybersecurity-phinder`: Node server for the online rooms (`phinder-server/server.js`), only reachable through nginx

After changes to `nginx.conf`, `phinder-server/` or `html/phinder/cards.js`, restart the containers (`docker compose restart`).
Plain HTML changes are live right away.

## Where things are

- `html/` static pages (no build step, no external resources)
- `html/phinder/cards.js` all Phinder messages and red-flag labels
- `phinder-server/server.js` online rooms, no dependencies
- `nginx.conf` headers, CSP, no access logs

## Privacy

No cookies, no localStorage, no tracking, no third-party resources, no access logs.
The Phinder server keeps rooms in memory only (no names, no IPs); a room is gone when it is closed or after 2 h idle.
The browser keeps the theme choice and the current room ID in sessionStorage (this tab only).
