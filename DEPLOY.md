# Deploy — Arena FC (app.arenafcapp.com)

Runbook para subir o projeto numa VPS Ubuntu do zero, com HTTPS no domínio
`app.arenafcapp.com`. O stack é **todo em Docker Compose**; o nginx do **host**
só faz TLS e repassa pro app.

---

## 0. Como fica a arquitetura

```
                          VPS (Ubuntu)
Internet ──443/80──▶  nginx do HOST  (TLS, app.arenafcapp.com, certbot)
                          │  proxy_pass
                          ▼
                   127.0.0.1:8080
                          │
                 ┌────────┴─────────────── Docker Compose ───────────────┐
                 │  nginx (interno)  →  /api/  →  api:3000  (NestJS)      │
                 │                      /webhooks/ → api:3000/webhooks/   │
                 │                      /        →  web:80  (PWA React)   │
                 │  api  ──────────────────────────▶  postgres:5432      │
                 └────────────────────────────────────────────────────────┘
```

- O container da **API já roda `prisma migrate deploy` + seed + boot** a cada
  start (`api/Dockerfile`). Você **não** roda migração na mão.
- **Postgres e API não são publicados no host** — só existem na rede interna do
  Docker (a api fala com o banco em `postgres:5432`, o nginx interno fala com a
  api em `api:3000`). O `docker-compose.prod.yml` cuida disso. Resultado: nada de
  banco/API exposto na internet **e** nada colidindo com outros serviços da VPS.
- Nada de túnel Cloudflare em produção: o postback da Payt vai direto pro
  domínio real.

---

## 1. Pré-requisitos

- Uma VPS Ubuntu 22.04/24.04 com IP público e acesso `ssh`.
- O domínio `arenafcapp.com` num registrador/DNS que você controla (o app vai no
  subdomínio `app.`).
- Usuário com `sudo` (os passos abaixo assumem que você está logado nele).

---

## 2. Apontar o DNS pro IP da VPS

No painel de DNS do domínio, crie um registro **A** apontando pro IP da VPS:

| Tipo | Nome  | Valor       |
|------|-------|-------------|
| A    | `app` | `IP_DA_VPS` |

Espere propagar (checar com `dig +short app.arenafcapp.com` — tem que devolver o
IP da VPS). **O certbot só emite o certificado depois que o DNS estiver apontando.**

---

## 3. Instalar Docker + Docker Compose

```bash
# Docker Engine + plugin do Compose v2 (o script oficial instala os dois)
curl -fsSL https://get.docker.com | sudo sh

# Rodar docker sem sudo
sudo usermod -aG docker $USER
newgrp docker   # aplica o grupo na sessão atual (ou saia e entre de novo)

# Conferir
docker --version
docker compose version
```

---

## 4. Clonar o projeto

```bash
sudo mkdir -p /opt && cd /opt
git clone <URL_DO_SEU_REPO> arenafc
cd arenafc
git checkout main          # ou a branch que você usa em produção
```

---

## 5. Criar o `.env` com os segredos reais

O Compose lê um arquivo `.env` na raiz. Parta do exemplo:

```bash
cp .env.example .env
# gere segredos fortes:
openssl rand -hex 32   # use pra JWT_SECRET
openssl rand -hex 24   # use pra POSTGRES_PASSWORD
nano .env
```

Preencha assim (o que **precisa** mudar em produção):

```dotenv
POSTGRES_USER=arenafc
POSTGRES_PASSWORD=<senha-forte-gerada>
POSTGRES_DB=arenafc
# host = "postgres" (nome do serviço no Compose); senha igual à de cima
DATABASE_URL=postgresql://arenafc:<senha-forte-gerada>@postgres:5432/arenafc?schema=public

JWT_SECRET=<hex-32-gerado>

# credenciais de webhook (a API não sobe sem elas)
LASTLINK_WEBHOOK_SECRET=<pode-deixar-um-valor-qualquer-se-não-usar-lastlink>
PAYT_WEBHOOK_TOKEN=f60f115ad1620367f874c14d4e5bb5ae   # a "Chave Única" da Payt

# opcionais (funciona sem, com degradação): IA e catálogo de times
DEEPSEEK_API_KEY=
API_FOOTBALL_KEY=

ALLOW_DEV_LOGIN=false
NODE_ENV=production
```

> **Nunca** commite o `.env`. Ele fica só na VPS.

---

## 6. Subir o stack

Sempre com os **dois** arquivos de compose (o `.prod` fecha as portas e liga o
auto-restart):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Acompanhe o boot (a API roda migração + seed antes de escutar):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
# espere por: "Nest application successfully started"
```

Teste local (ainda sem domínio/TLS):

```bash
curl -I http://127.0.0.1:8080/            # PWA → 200
curl -i  http://127.0.0.1:8080/api/health # ou qualquer rota pública da API
```

> **Dica:** crie um alias pra não repetir o `-f` toda hora:
> `alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'`
> Aí é só `dc up -d --build`, `dc logs -f api`, `dc ps`, etc.

---

## 7. nginx do host + HTTPS (certbot)

O app já escuta em `127.0.0.1:8080`. Agora o nginx do **host** termina o TLS e
repassa tudo pra lá.

```bash
sudo apt update
sudo apt install -y nginx
```

Crie o site:

```bash
sudo nano /etc/nginx/sites-available/app.arenafcapp.com
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name app.arenafcapp.com;

    # postbacks podem crescer; deixa folga
    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/app.arenafcapp.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Emita o certificado (adiciona o bloco 443 + redirect 80→443 sozinho):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.arenafcapp.com
```

O certbot já instala um timer de **renovação automática**. Confere com:

```bash
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

Pronto: `https://app.arenafcapp.com` no ar. 🎉

---

## 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Repare que **5432 (Postgres) e 3000 (API) não são liberados** — eles nem são
publicados no host (só vivem na rede interna do Docker), então o mundo não
alcança. É isso que você quer.

> Se a VPS já tem apps rodando e você está ligando o UFW agora, garanta o
> `sudo ufw allow OpenSSH` **antes** do `enable` (pra não se trancar do lado de
> fora) e libere também qualquer porta pública que seus outros apps usem.

---

## 9. Configurar o postback da Payt no domínio

Agora que o domínio é real e público, aponte o postback da Payt pra ele (sem
túnel):

```
https://app.arenafcapp.com/webhooks/payt?token=f60f115ad1620367f874c14d4e5bb5ae
```

Tipo **PayT V1**, eventos **Finalizada/Aprovada + Venda**. Clique em
**"Testar URL"** → deve passar. Os produtos (Premium `4EPO3E`, Diamante
`R229VD`) já são semeados no boot da API.

---

## 10. Dia a dia (operação)

Assumindo o alias `dc` do passo 6:

```bash
# ver status / logs
dc ps
dc logs -f api
dc logs -f nginx          # nginx interno do compose

# atualizar o código (redeploy) — migração + seed rodam sozinhos
git pull
dc up -d --build

# reiniciar só a API (equivalente ao "pm2 restart")
dc restart api

# derrubar tudo / subir tudo
dc down
dc up -d
```

### Backup do banco

Em produção, mantenha o **Neon como banco principal** e grave dumps lógicos
verificados na VPS. Não mantenha um segundo Postgres ativo apenas como
"backup": sem replicação e failover bem operados ele diverge silenciosamente e
vira mais um banco para atualizar, proteger e monitorar.

O job `db-backup` usa a mesma `DATABASE_URL` da API, produz um arquivo custom
compactado, valida o arquivo com `pg_restore --list`, grava SHA-256 e só então
marca a execução como bem-sucedida. Dumps incompletos ficam com sufixo
`.partial` e nunca contam como backup válido.

Teste manual antes de instalar o agendamento:

```bash
mkdir -p /opt/arenafc/backups
chmod 700 /opt/arenafc/backups

docker compose --env-file .env.production \
  -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm db-backup

ls -lh backups/
cat backups/last-success.json
```

Instale os timers versionados no repositório:

```bash
sudo cp infra/systemd/arenafc-backup.service /etc/systemd/system/
sudo cp infra/systemd/arenafc-backup.timer /etc/systemd/system/
sudo cp infra/systemd/arenafc-healthcheck.service /etc/systemd/system/
sudo cp infra/systemd/arenafc-healthcheck.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now arenafc-backup.timer arenafc-healthcheck.timer

systemctl list-timers 'arenafc-*'
journalctl -u arenafc-backup.service -n 50 --no-pager
```

Por padrão o backup roda diariamente, retém 14 dias e o check operacional falha
se o dump tiver mais de 30 horas. Ajuste `BACKUP_DIR` e
`BACKUP_RETENTION_DAYS` em `.env.production`; se mudar `BACKUP_DIR`, replique o
valor no `arenafc-healthcheck.service`.

O timer detecta a falha, mas um alerta precisa sair da VPS. Configure também um
monitor externo para `https://app.arenafcapp.com/api/health/live` e encaminhe falhas
do systemd/journald para o seu canal de alerta. Como etapa seguinte, copie os
dumps para S3/R2: uma cópia que existe somente na VPS não protege contra perda
do disco ou comprometimento do servidor.

No painel do Neon, habilite a maior janela de instant restore compatível com o
plano e snapshots agendados. Isso cobre recuperação rápida; o `pg_dump`
independente cobre erro de fornecedor/conta e retenção fora do Neon.

### Observabilidade operacional

- A API emite logs JSON com `requestId`, status e latência; consulte com
  `dc logs --since=30m api`.
- Todos os containers agora rotacionam logs (`10 MB`, cinco arquivos), evitando
  que logs encham o disco da VPS.
- `/api/health/live` confirma somente que a API está viva e é usado pelo Docker
  e pelo monitor frequente sem acordar continuamente o Postgres serverless.
- `/api/health` confirma API + banco e é reservado para deploys e diagnósticos
  pontuais; não configure polling frequente nessa rota.
- `infra/backup/check.sh` confirma a saúde do processo e o frescor do último
  backup verificado sem consumir compute do Neon.

---

## 11. "E o PM2?" — por que você não precisa dele aqui

PM2 é um **gerenciador de processos Node**: ele mantém o `node` no ar, reinicia
se cair, sobe no boot e junta logs. **Neste projeto o Docker já faz tudo isso**,
porque a API roda dentro de um container:

| O que o PM2 faria           | Equivalente aqui (Docker)                          |
|-----------------------------|----------------------------------------------------|
| `pm2 start`                 | `docker compose up -d`                             |
| Reiniciar ao cair           | `restart: unless-stopped` (no `docker-compose.prod.yml`) |
| Subir no boot da VPS        | o mesmo `restart: unless-stopped` + o serviço `docker` já sobe no boot |
| `pm2 restart api`           | `dc restart api`                                   |
| `pm2 logs`                  | `dc logs -f api`                                   |

Botar PM2 por cima significaria rodar a API **fora** do Docker (`node dist/...`),
o que briga com o desenho do projeto (Dockerfile faz build, migração e seed
juntos) e te obriga a gerenciar Node, Prisma e migração na mão. **Recomendação:
fique no Docker** — é o "PM2" deste projeto, só que já configurado.

Se um dia você quiser mesmo PM2 (por gosto ou padrão da sua VPS), o caminho
seria: rodar só o `postgres` no Docker, buildar a API no host
(`cd api && npm ci && npm run build && npx prisma migrate deploy && npm run seed`)
e subir com `pm2 start dist/src/main.js --name arenafc-api`, apontando o nginx do
host pra `127.0.0.1:3000`. Funciona, mas é mais peça pra manter — só vá por aí se
tiver um motivo forte.

---

## 12. Convivendo com apps PM2 (ou outros serviços) na mesma VPS

Se a VPS já tem outros apps rodando com PM2, **eles não brigam com este stack**:
PM2 gerencia processos Node "pelados", o Docker gerencia containers — supervisores
independentes. O **único** recurso disputado é **porta do host**. Três pontos:

**1. nginx (80/443) — o principal.** Só um servidor ocupa a 80/443. O modelo certo
numa VPS multi-app é **um nginx do host como porta de entrada**, com **um
`server_block` por domínio** (o `server_name` diferencia). Cenários:

- Seus apps PM2 **já ficam atrás desse nginx** (o normal): você só **adiciona** o
  bloco do `app.arenafcapp.com` (Passo 7). Zero conflito — é pra isso que serve o
  virtual host.
- Algum app PM2 escuta **direto na 80** (Node ouvindo `:80`): coloque-o também
  atrás do nginx (`proxy_pass` pra porta interna dele). O nginx vira o dono da
  80/443 e todos ficam atrás.
- Sua porta de entrada hoje é **Apache/Caddy** (não nginx): o vhost novo vai
  **nele**, apontando pra `127.0.0.1:8080`. Não instale um segundo nginx.

**2. Portas internas do Docker.** Neste stack, Postgres e API **não são publicados**
(rede interna só) — então não colidem com nada. A única porta publicada no host é a
do nginx interno: `127.0.0.1:8080`. Se algum PM2 já usa a 8080, troque no
`docker-compose.prod.yml` (ex.: `127.0.0.1:8090:80`) e aponte o `proxy_pass` do
nginx do host pra ela.

**3. Antes de subir, veja o que já está ocupado:**

```bash
pm2 list
sudo ss -ltnp | grep -E ':(80|443|8080)\b'
```

Resumo: mantenha **um** front-door (nginx do host) na 80/443 servindo todos os
domínios, e garanta que a porta do nginx interno (8080) esteja livre. O resto do
stack é invisível pro host.

---

## Notas / pendências conhecidas

- **Links de checkout no frontend são build-time.** As variáveis
  `VITE_CHECKOUT_URL_*` (botões de "assinar/comprar" que levam pro
  `checkout.payt.com.br/...`) são lidas quando o `web` é **buildado**, e o
  `web/Dockerfile` ainda não repassa esses args. Pra ligar os botões aos
  checkouts da Payt, é preciso adicionar `ARG`/`ENV VITE_CHECKOUT_URL_*` no
  build do `web`. (O recebimento do pagamento via webhook já funciona sem isso.)
- Mantenha `.env` e qualquer `docker-compose.override.yml` **fora do git**.
