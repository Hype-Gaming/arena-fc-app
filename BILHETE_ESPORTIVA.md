# Bilhete pré-selecionado na Esportiva Bet

Este documento explica a lógica que faz o bilhete (bet slip) montado dentro do Beto IA
abrir **já com as seleções marcadas** no site da Esportiva Bet.

## Visão geral

O usuário monta o bilhete dentro do Beto IA clicando em odds (nas partidas, nas
sugestões da IA, nas múltiplas ou nos bilhetes prontos). Quando clica em
**"Abrir na Esportiva"**, o app abre um modal fullscreen com um iframe do site da
Esportiva, cuja URL carrega as seleções codificadas em um query param. O site da
Esportiva lê esse param e monta o bilhete já preenchido.

```
Usuário clica em odds          BetSlipBar aparece           BetSlipModal abre iframe
(matches, IA, múltiplas,  -->  (barra flutuante com   -->   {registerUrl}?selections=
 super odds, bilhetes)          contagem + odd comb.)        {matchId}-{oddId},...
```

## Por que funciona: IDs compartilhados com a Altenar

O ponto central de toda a lógica: **o site da Esportiva Bet roda sobre a plataforma
Altenar, e o Beto IA consome dados de odds dessa mesma plataforma** via
[altenar.service.ts](../api/src/sportsbook/altenar.service.ts). Ou seja, os IDs de
evento (`matchId`/`eventId`) e de seleção (`oddId`/`selectionId`) que circulam no
frontend do Beto IA são os **mesmos IDs nativos** que o site da Esportiva usa
internamente.

Isso é intencional e está documentado nos tipos da API
([altenar.types.ts:72-74](../api/src/sportsbook/altenar.types.ts#L72-L74)):

```ts
/** Altenar selection (odd) id — used to add to the bet slip. */
oddId: number;
/** Altenar market id — used for internal dedup in the slip. */
```

E no mapeamento dos bilhetes prontos
([altenar.service.ts:1105-1122](../api/src/sportsbook/altenar.service.ts#L1105-L1122)),
os IDs crus da Altenar são mantidos junto dos campos "humanos" justamente para que o
frontend consiga montar o deep-link sem uma segunda chamada:

```ts
// Keep the raw Altenar ids next to the human-friendly fields so
// the frontend can (a) link to the match detail page and (b)
// push the selection to the bet slip / Esportiva Bet deep-link
// without needing a second round-trip.
oddId: o.selectionId,
marketId: o.marketId,
```

Sem esse alinhamento de IDs, o deep-link não teria como referenciar as odds no site
de destino.

## O contrato da URL

Montado em [useBetSlip.ts:23-33](../app/composables/useBetSlip.ts#L23-L33):

```
{registerUrl}?selections={matchId}-{oddId},{matchId}-{oddId},...
```

- `registerUrl` — link de cadastro/afiliado do parceiro (ver seção multi-tenant).
- `selections` — pares `matchId-oddId` separados por vírgula. `matchId` é o ID do
  evento na Altenar; `oddId` é o ID da seleção (odd) na Altenar.
- Sem seleções, a URL é só o `registerUrl` base (sem query).

Exemplo real:

```
https://esportiva.bet.br/register?btag=parceiro123&selections=2554321-98765432,2554999-98770001
```

> **Importante:** o parsing do `?selections=` acontece **do lado da Esportiva**
> (site Altenar). Este repositório só monta a URL — o formato é um contrato acordado
> com a Esportiva. Se o site deles mudar o parâmetro, o deep-link quebra sem nenhum
> erro aparente do nosso lado (o iframe abre normalmente, só que com o bilhete vazio).

## Peças envolvidas

### `useBetSlip` — o estado central

[app/composables/useBetSlip.ts](../app/composables/useBetSlip.ts)

Composable com estado global (`useState`, compartilhado entre todos os componentes):

| Item | O que faz |
|---|---|
| `selections` | Lista de `BetSelection` (`matchId`, `marketId`, `oddId`, `oddName`, `matchLabel`, `price`) |
| `count` | Quantidade de seleções |
| `combinedPrice` | Odd combinada = **produto** de todos os `price` |
| `selectionsParam` | String `matchId-oddId,matchId-oddId,...` |
| `esportivaUrl` | `registerUrl` + `?selections=...` (vazia enquanto o link do tenant não carregou) |
| `toggle(sel)` | Adiciona/remove com regras de deduplicação (abaixo) |
| `isSelected(oddId)` | Usado pelas páginas para pintar a odd como selecionada |
| `open()` / `close()` | Controlam o modal (`open()` ignora bilhete vazio) |

**Regras do `toggle`** ([useBetSlip.ts:39-57](../app/composables/useBetSlip.ts#L39-L57)):

1. Se o `oddId` já está no bilhete → **remove** (comportamento de toggle).
2. Se já existe outra seleção do **mesmo `matchId` + `marketId`** → **substitui**
   (não faz sentido apostar em dois resultados do mesmo mercado, ex.: casa E fora).
3. Caso contrário → adiciona e dispara o evento de gamificação `BETSLIP_ADDED`
   (via `useGamification().trackQuietly`).

### `useTenant` — de onde vem o `registerUrl`

[app/composables/useTenant.ts](../app/composables/useTenant.ts)

O app é multi-tenant por slug na URL (`/:tenant/dashboard/...`). Cada parceiro ou
influenciador tem seu próprio link de afiliado, então o bilhete abre **pelo link do
parceiro certo** e a atribuição/comissão é preservada. Ordem de resolução:

1. **API** — `GET /slug-links/{slug}` retorna o `registerUrl` cadastrado no admin
   (modelo `SlugLink` no Prisma, [schema.prisma:466](../api/prisma/schema.prisma#L466)).
2. **Env** — `config.public.tenantRegisterUrls[slug]` (fallback por variável de ambiente).
3. **Default** — `config.public.registerUrl` ou `https://esportiva.bet.br/register`
   (usado quando não há slug na rota).

`isRegisterUrlReady` protege contra corrida: enquanto o link remoto do slug está
carregando, `esportivaUrl` fica vazia e o modal mostra "Carregando link do parceiro…"
em vez de abrir o iframe com o link errado (ou o default sem atribuição).

### `BetSlipBar` — a barra flutuante

[app/components/BetSlipBar.vue](../app/components/BetSlipBar.vue)

Aparece fixa no rodapé sempre que `count > 0`. Mostra contagem, odd combinada e
preview da primeira seleção. Botões: **Limpar** (`clear()`) e
**"Abrir na Esportiva"** (`open()` → abre o modal).

### `BetSlipModal` — o iframe da Esportiva

[app/components/BetSlipModal.vue](../app/components/BetSlipModal.vue)

Modal fullscreen (Teleport para `body`) com:

- **Iframe** apontando para `esportivaUrl` — é aqui que o site da Esportiva abre com
  o bilhete pré-selecionado. O iframe tem `allow="clipboard-write; payment"` e
  `referrerpolicy="no-referrer-when-downgrade"`.
- **"Abrir em nova aba"** — mesma `esportivaUrl` como link `target="_blank"`, para
  quem preferir sair do iframe (ou se o site bloquear embed).
- **Estado de loading** enquanto `isRegisterUrlReady` é falso ou `esportivaUrl` vazia.
- [IframeUrlDebug](../app/components/IframeUrlDebug.vue) — barra de debug que mostra
  slug e URL final. Só aparece com `?debugSlug=1` na URL do app.

Ambos os componentes são montados uma única vez no layout
[dashboard.vue:368-369](../app/layouts/dashboard.vue#L368-L369), então o bilhete
persiste enquanto o usuário navega entre as páginas do dashboard.

## Pontos de entrada (quem adiciona seleções)

Todas as superfícies convergem para o mesmo `betSlip.toggle()`, sempre com IDs Altenar:

| Superfície | Arquivo | Função |
|---|---|---|
| Lista de partidas (odds 1X2 etc.) | [matches.vue](../app/pages/dashboard/matches.vue) | `toggleOdd` |
| Detalhe da partida (board completo de mercados) | [match/[id].vue](../app/pages/dashboard/match/%5Bid%5D.vue) | `toggleOdd` (bloqueia odd suspensa: `odd.status !== 0`) |
| Pick da IA no detalhe da partida | [match/[id].vue](../app/pages/dashboard/match/%5Bid%5D.vue) | `addAiPick` |
| Top picks diários da IA | [index.vue](../app/pages/dashboard/index.vue) | `toggleTopPick` |
| Múltiplas da IA (todas as pernas de uma vez) | [index.vue](../app/pages/dashboard/index.vue) | `toggleMultipla` |
| Mercados de jogador / artilheiro (Copa 2026) | [index.vue](../app/pages/dashboard/index.vue) | `togglePlayerMarketOdd`, `addPlayerOutrightToSlip` |
| Odds avulsas nos cards da home | [index.vue](../app/pages/dashboard/index.vue) | `toggleOdd` |
| Bilhetes prontos (Super Odds / Múltiplas da casa) | [bets.vue](../app/pages/dashboard/bets.vue) | `toggleCard` (adiciona/remove **todas** as seleções do card) |

Padrão dos toggles "em lote" (`toggleMultipla`, `toggleCard`): se **todas** as pernas
já estão no bilhete, remove todas; senão, adiciona só as que faltam. Isso evita que o
toggle individual (que removeria as já presentes) desmonte a múltipla pela metade.

## Fluxo completo

```
1. Backend (altenar.service.ts) busca odds na Altenar e expõe
   eventId/oddId/marketId crus junto dos dados de exibição.
        │
2. Usuário clica numa odd → betSlip.toggle({matchId, marketId, oddId, ...})
   (dedup por oddId; substituição por matchId+marketId; evento de gamificação)
        │
3. BetSlipBar aparece (count > 0) → usuário clica "Abrir na Esportiva"
        │
4. useTenant resolve o registerUrl do slug (API → env → default)
        │
5. useBetSlip monta: {registerUrl}?selections=matchId-oddId,matchId-oddId
        │
6. BetSlipModal abre o iframe com essa URL
        │
7. O site da Esportiva (Altenar) lê ?selections= e preenche o bilhete
   → usuário só confirma o valor e finaliza a aposta lá, logado na conta dele.
```

## Casos de borda e decisões de projeto

- **Aposta acontece na Esportiva, não no Beto IA.** O app nunca registra a aposta;
  ele só prepara o bilhete. Regulação, saldo, login e confirmação ficam 100% do lado
  da Esportiva.
- **Link do tenant ainda carregando** → `esportivaUrl = ''`, modal mostra spinner.
  Nunca abre iframe com URL default de fallback para slug de parceiro (protegeria a
  atribuição errada).
- **Bilhete vazio** → `open()` é no-op e a barra nem aparece; se a URL for usada sem
  seleções, vai só o `registerUrl` base.
- **Odd suspensa** → o detalhe da partida bloqueia o clique (`odd.status !== 0`).
- **Duas odds do mesmo mercado** → a segunda substitui a primeira (nunca coexistem).
- **Estado não persiste em reload** — `useState` vive só na sessão da SPA. Recarregar
  a página zera o bilhete (decisão implícita; se um dia incomodar, o caminho é
  persistir `selections` em `localStorage`).
- **Odds podem mudar entre o clique e a abertura** — o `price` guardado é usado só
  para exibir a odd combinada no app; o valor válido é sempre o que o site da
  Esportiva mostrar ao abrir o bilhete.

## Como debugar

1. Adicione `?debugSlug=1` à URL do app — o `IframeUrlDebug` passa a mostrar, dentro
   do modal, o slug ativo e a URL exata enviada ao iframe.
2. Confira se os pares `matchId-oddId` da URL batem com IDs válidos da Altenar
   (o `matchId` deve ser o **eventId Altenar**, não IDs internos de outras fontes
   como ESPN/Sportmonks).
3. Se o bilhete abrir vazio na Esportiva com URL aparentemente correta, o provável é
   mudança no parsing do `?selections=` do lado deles — validar com o contato da
   Esportiva.
