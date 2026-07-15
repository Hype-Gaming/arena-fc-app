# Plano de Evolucao do Perfil e Conquistas

## Fase 1 - Perfil visual com dados atuais

- Redesenhar `/perfil` com avatar, plano, nivel, XP, resumo e conquistas agrupadas.
- Usar apenas dados ja disponiveis em `/me` e `/gamification/me`.
- Exibir progresso por conquista com `progress` e `threshold`.
- Manter icones SVG no lugar de emojis.

## Fase 2 - Nickname e avatar

- Adicionar `nickname` e `avatarKey` ao modelo `User`.
- Criar endpoints `PATCH /me/profile` e `GET /me`.
- Validar nickname unico ou definir regra de duplicidade aceitavel.
- Criar seletor de avatar no front.

## Fase 3 - Streak real

- Adicionar tabela ou campos para `currentLoginStreak`, `bestLoginStreak` e `lastLoginAt`.
- Emitir evento de login diario quando o usuario entra no app.
- Atualizar `/gamification/me` com metricas de streak.
- Criar conquistas de streak: 3, 7, 14, 30, 60 e 100 dias.

## Fase 4 - Missoes diarias

- Criar modelo para missoes diarias com chave, meta, XP e janela de validade.
- Registrar progresso por usuario e por dia.
- Resetar ou recalcular missoes usando timezone do usuario ou timezone padrao do app.
- Mostrar "Conquistas Diarias" com estado completo, progresso e recompensa.

## Fase 5 - Categorias persistidas

- Adicionar `category` e `rewardXp` em `Achievement`.
- Migrar seeds atuais para categorias: permanente, streak e diaria.
- Parar de inferir categoria no front por `key`/`icon`.
- Ordenar conquistas por categoria, dificuldade e status.

## Fase 6 - Eventos de produto

- Conectar conquistas com bilhetes, IA Tipster, greens, compras, plano e convites.
- Registrar progressos parciais mesmo antes da conquista desbloquear.
- Mostrar data de desbloqueio e recompensa aplicada.
