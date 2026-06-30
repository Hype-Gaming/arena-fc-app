# Tips App — App Core (MVP) — Design

**Data:** 2026-06-30
**Status:** Aprovação pendente
**Escopo:** Primeira peça de um projeto maior (app core). Funil de aquisição e automação de Telegram terão specs próprias depois.

---

## 1. Contexto e objetivo

Clone de um app de palpites esportivos (referência: "Premier FC"). O produto central é uma
**IA Tipster**: o usuário escolhe/digita um jogo e o app entrega uma **entrada** (palpite:
mercado + seleção + odd + justificativa) de forma conversacional, **consumindo créditos**.

No MVP a IA é **assistida**: um admin cadastra os jogos e as entradas; o app apenas as apresenta
de forma conversacional. A troca futura por IA real (LLM + API esportiva) não deve exigir refazer
o frontend.

Monetização dupla, como no concorrente:
- **Assinatura** (Free / Premium) — controla acesso.
- **Créditos** (consumíveis) — destravar cada entrada/análise.

Premium e créditos são independentes: Premium dá **bônus mensal de créditos**, mas destravar uma
entrada **sempre** consome crédito.

---

## 2. Stack e topologia

Auto-hospedado em VPS, tudo via `docker-compose`.

```
[ Navegador / PWA ]
        │ HTTPS
        ▼
     [ nginx ]  ← proxy reverso + TLS (Let's Encrypt/certbot)
      │      │
      │      └──→ [ web ]  React + Vite (PWA, build estático)
      └─────────→ [ api ]  NestJS (REST)
                     │
                     └──→ [ postgres ]  (volume + backup pg_dump)

  LastLink/Payt ──(webhook HTTPS)──→ nginx → api  (POST /webhooks/:provider)
```

| Camada        | Tecnologia                                   |
|---------------|----------------------------------------------|
| Frontend      | React + Vite, PWA (manifest + service worker) |
| Backend       | NestJS (REST)                                |
| ORM           | Prisma                                        |
| Banco         | PostgreSQL                                    |
| Proxy/TLS     | nginx + certbot                              |
| Orquestração  | docker-compose                               |
| Pagamento     | LastLink agora; Payt depois (via abstração)  |

Containers do MVP: `nginx`, `web`, `api`, `postgres`. (Redis reservado para v2: push/filas.)

Monorepo: `web/` e `api/` no mesmo repositório, mais `docker-compose.yml` e `infra/`.

### Módulos NestJS
`auth`, `users`, `tips`, `tipster`, `credits`, `billing`, `gamification`, `admin`, `tutorial`.

---

## 3. Modelo de dados

Fonte da verdade do saldo é o **ledger** (`CreditTransaction`) — nunca um inteiro solto.

- **User** — `id, email (único), createdAt, level, xp, role (user|admin)`
- **AuthCode** — `userId, code (6 díg.), expiresAt, usedAt` (OTP por e-mail)
- **Session/RefreshToken** — `userId, tokenHash, expiresAt`
- **Plan** — `key (free|premium), name, priceLabel, monthlyCredits`
- **Subscription** — `userId, planKey, status (active|canceled|expired), provider, externalId, currentPeriodEnd`
- **CreditTransaction** — `userId, type (purchase|grant|unlock|refund), amount (+/-), balanceAfter, refType, refId, createdAt`
- **Category** — `id, name, slug, icon`
- **Match** — `categoryId, homeTeam, awayTeam, competition, startsAt, status (scheduled|live|finished)`
- **Entrada** — `matchId, market, selection, odd, justification, costInCredits, status (pending|green|red), publishedAt`
- **EntradaUnlock** — `userId, entradaId, unlockedAt` (único por par)
- **Product** — `provider, externalProductId, grantType (credits|plan), grantCredits, grantPlanKey, active`
- **WebhookEvent** — `provider, externalId (único), type, payload (jsonb), processedAt`
- **Achievement** — `key, name, description, icon, criteria (jsonb)`
- **UserAchievement** — `userId, achievementKey, unlockedAt, progress`
- **ChatSession** — `userId, createdAt`
- **ChatMessage** — `sessionId, role (user|assistant), content, entradaId?, createdAt`

Saldo do usuário = `SELECT balanceAfter FROM CreditTransaction WHERE userId=? ORDER BY createdAt DESC LIMIT 1` (ou 0). Toda escrita de crédito é transacional e calcula `balanceAfter`.

---

## 4. Fluxos principais

### 4.1 Auth (e-mail sem senha, OTP)
1. `POST /auth/request-code { email }` → cria/acha `User`, gera **OTP de 6 dígitos**, envia por e-mail, grava `AuthCode` com expiração (ex.: 10 min).
2. `POST /auth/verify { email, code }` → valida código não usado/não expirado → emite **JWT access** (curto) + **refresh token** (longo, hash no banco).
3. `POST /auth/refresh` rotaciona o refresh.

O e-mail é a identidade — casa com o e-mail do comprador no webhook do gateway.

### 4.2 Tips (feed)
- Cards por **Category**. Cada **Entrada** aparece **bloqueada**: mercado/odd visíveis, justificativa oculta.
- Destravar: `POST /tips/entradas/:id/unlock` → debita `costInCredits` (ledger, transacional) → cria `EntradaUnlock` → retorna justificativa. Idempotente: se já destravou, retorna sem cobrar de novo.

### 4.3 IA Tipster — Chat (IA assistida)
1. Usuário digita/escolhe jogo → `GET /tipster/match-search?q=` faz **match contra `Match` cadastrados** (sem API externa no v1).
2. App responde "Achei esse jogo. Confirma?" com o card.
3. Confirmado → `POST /tipster/analyze { matchId }` → debita crédito → monta resposta conversacional a partir da(s) **Entrada(s)** do jogo (a "ENTRADA PRINCIPAL").
4. Histórico persistido em `ChatSession`/`ChatMessage`.

### 4.4 Créditos & Planos
- Todo usuário logado **pode usar** o feed e a IA Tipster; destravar entrada e pedir análise **sempre** consomem crédito (`amount` negativo no ledger). Sem crédito, a ação é bloqueada com CTA "Comprar créditos".
- **Free**: começa com **0 créditos**, sem bônus mensal. Pode comprar pacotes de crédito avulsos.
- **Premium**: assinatura ativa concede **bônus mensal de créditos** (`Plan.monthlyCredits`, via `CreditTransaction type=grant` na ativação/renovação) e dá acesso a entradas/perks marcados como premium. Continua consumindo crédito por entrada/análise.
- Regra de ouro: **assinatura ≠ crédito**. Plano controla acesso/bônus; crédito controla cada desbloqueio.

---

## 5. Pagamentos — abstração LastLink → Payt

- Interface `PaymentProvider` + **um adaptador por provedor** (`LastLinkAdapter`, depois `PaytAdapter`).
- Endpoint único: `POST /webhooks/:provider`.
- Pipeline do webhook:
  1. **Validar assinatura/token** do provedor (contrato exato confirmado na doc do provedor na implementação).
  2. **Dedupe**: gravar `WebhookEvent` por `externalId`; se já existe processado, ignora (idempotência — gateways reenviam).
  3. Resolver `Product` (provider + externalProductId).
  4. Aplicar grant: `credits` → `CreditTransaction(type=purchase)`; `plan` → ativa/renova `Subscription` + concede `monthlyCredits`.
  5. Casar usuário **pelo e-mail** do comprador (cria User se não existir).
- Comprar créditos / assinar = abrir o **checkout hospedado** do provedor.
- Trocar/empilhar gateway = novo adaptador, sem mexer no resto.

---

## 6. Gamificação

- **XP** concedido por eventos do backend: login diário, destravar entrada, indicar amigo, entrada "green".
- **Níveis** por faixas de XP (`level` derivado/atualizado ao ganhar XP).
- **Conquistas** por marcos (`Achievement.criteria` em jsonb; ex.: 1ª entrada, 10 entradas, 1ª green).
- Avaliação dirigida por eventos de domínio (ex.: `entrada.unlocked`, `entrada.green`) → serviço de gamificação atualiza XP/nível/conquistas.

---

## 7. Admin / Backoffice

CRUD protegido por `role=admin`:
- Categorias, Matches, Entradas (incl. marcar **green/red** — dispara XP/conquistas).
- Produtos (mapa `provider → grant`).
- Visão de usuários e saldos (read-only do ledger).

---

## 8. Tutorial in-app & PWA

- **Tutorial**: conteúdo em passos, versionável; overlay no 1º acesso + aba Tutorial.
- **PWA**: `manifest.json` + service worker (instalável, "adicionar à tela inicial"). Push fica para v2.

---

## 9. Identidade visual

Base nas telas de referência: fundo navy/preto, dourado de destaque, verde nos CTAs, cards
arredondados, navegação por 3 abas inferiores (Tips, IA Tipster, Perfil). Mascotes 3D ficam como
arte a definir.

---

## 10. Estratégia de testes

- **Unit (Jest)**: ledger de créditos, idempotência de webhook, regras de XP/níveis.
- **Integração (e2e Nest + Postgres de teste)**: auth OTP, destravar entrada, webhook→crédito, ativação de plano.
- **TDD** obrigatório nos módulos de dinheiro (`credits`, `billing`).

---

## 11. Fora de escopo (v2+)

- IA Tipster **Ao Vivo** (depende de API de dados ao vivo).
- IA real (LLM + API esportiva) no lugar da assistida.
- Push notifications, filas, Redis.
- Funil de aquisição (landing/quiz/checkout) — spec própria.
- Automação de Telegram — spec própria.

---

## 12. Riscos e decisões em aberto

- **Contrato de webhook** (LastLink/Payt): nomes de evento e header de assinatura a confirmar na doc na implementação.
- **Envio de e-mail** (OTP): provedor SMTP/transacional a definir (ex.: Resend, SES, SMTP próprio).
- **Match de jogos** no v1 é por texto contra base cadastrada; busca fuzzy simples basta.
