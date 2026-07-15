<!-- infra/TLS.md -->
# TLS / HTTPS (production)

The MVP `docker-compose.yml` runs nginx on port 80 only. For a public VPS,
terminate TLS at nginx with Let's Encrypt via certbot.

## One-time issuance
1. Point the domain A-record at the VPS.
2. Add a `certbot/certbot` service and a shared `./infra/letsencrypt:/etc/letsencrypt`
   volume mounted into the nginx container.
3. Issue the cert (webroot challenge):
   ```
   docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d example.com
   ```
4. Add a `listen 443 ssl;` server block to `infra/nginx/nginx.conf` referencing
   `/etc/letsencrypt/live/example.com/fullchain.pem` and `privkey.pem`, and 301-redirect
   port 80 to 443.

## Renewal
Run `docker compose run --rm certbot renew` from a daily cron on the host and
`docker compose exec nginx nginx -s reload` afterwards.
