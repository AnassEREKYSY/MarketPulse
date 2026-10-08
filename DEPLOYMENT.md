# Deployment

Every push to `main` runs `.github/workflows/ci-cd.yml`:

1. **API**: `dotnet build` and `dotnet test`.
2. **Client**: production build and Playwright end-to-end tests.
3. **Image**: builds the root `Dockerfile` and pushes `ghcr.io/anasserekysy/marketpulse:latest` and `:<commit sha>`. Pull requests only build it.
4. **Deploy**: copies `deploy/docker-compose.prod.yml` and `deploy/deploy.sh` to `~/marketpulse` on the VM and runs `deploy.sh`.

## What runs on the VM

One container, `marketpulse`, on the `web` network, published on `127.0.0.1:5310` (only for the health check). It serves the app and the API (`/api/...`). A Docker volume (`marketpulse_data`) keeps the cache across redeploys, so the Adzuna quota is not spent again after each deploy.

`deploy.sh`:

- saves the settings to `~/marketpulse/.env` (mode 600). A setting that is not provided keeps its saved value, so **the Adzuna keys already in `~/marketpulse/.env` from the old setup are reused**;
- pulls the new image first (the running version stays up if the pull fails);
- removes the old `marketpulse-nginx`, `marketpulse-api`, `marketpulse-client` and `marketpulse-redis` containers, then starts the new one;
- waits for `/api/health`, then runs `nginx -t` and reloads the `reverse-proxy` container.

## GitHub settings

| Secret | Use |
| --- | --- |
| `OVH_HOST`, `OVH_USER`, `OVH_SSH_PRIVATE_KEY` | SSH access to the VM (already set for the old pipeline; `SSH_PRIVATE_KEY` also works) |
| `GHCR_TOKEN` | Token with `write:packages`, used to push the image and to pull it on the VM |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Optional if they are already in `~/marketpulse/.env` on the VM |

Optional variable `MARKETPULSE_BIND` (default `127.0.0.1:5310`) changes the host port.

## Domain and HTTPS (once)

The old setup started its own Nginx on port 443, which clashes with the `reverse-proxy` container. The site now goes through `reverse-proxy` like the other apps, with its own certificate (webroot method, same as Skinet).

1. DNS: add an `A` record `marketpulse` pointing to the VM IP, and wait until `dig +short marketpulse.anasserekysy.com` returns it.
2. HTTP site for the certificate challenge:
   ```bash
   cd /opt/nginx/conf.d
   sudo curl -fsSL https://raw.githubusercontent.com/AnassEREKYSY/MarketPulse/main/deploy/nginx/marketpulse-http-only.conf -o marketpulse.conf
   docker exec reverse-proxy nginx -t && docker exec reverse-proxy nginx -s reload
   ```
3. Certificate:
   ```bash
   sudo certbot certonly --webroot -w /etc/letsencrypt/acme-webroot -d marketpulse.anasserekysy.com
   ```
4. Full site:
   ```bash
   sudo curl -fsSL https://raw.githubusercontent.com/AnassEREKYSY/MarketPulse/main/deploy/nginx/marketpulse.conf -o /opt/nginx/conf.d/marketpulse.conf
   docker exec reverse-proxy nginx -t && docker exec reverse-proxy nginx -s reload
   curl -fsS https://marketpulse.anasserekysy.com/api/health
   ```

## Adzuna limits

The free plan allows about 25 calls a minute and 250 a day. MarketPulse stops at 240 a day by default (`ADZUNA_DAILY_LIMIT` in `.env`). One new search costs about 5 calls for the overview, and most other screens reuse them. `/api/health` shows the calls used today.

## Manual deploy or rollback

```bash
cd ~/marketpulse
IMAGE_TAG=<commit sha> ./deploy.sh
docker compose -f docker-compose.prod.yml logs -f
```
