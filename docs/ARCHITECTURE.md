# Arquitetura DDD

O projeto foi organizado por **contextos de negócio** e por responsabilidade técnica. O objetivo é que mudanças em autenticação, bilhetes ou pagamentos fiquem isoladas, em vez de se espalharem por uma pasta genérica de "services".

## API (`api/src`)

```text
contexts/                 # bounded contexts: auth, billing, tips, bilhetes...
  <contexto>/             # regras e casos de uso daquele domínio
    dto/                  # contrato HTTP de entrada/saída
    adapters/ | ai/       # integrações específicas do contexto
common/                   # preocupações transversais (filtros e logging)
prisma/                   # infraestrutura compartilhada de persistência
app.module.ts             # composição dos contextos
```

Cada pasta em `contexts` representa uma fronteira de domínio. Controllers são a camada de apresentação HTTP; services concentram os casos de uso; DTOs são contratos de transporte; adapters e providers encapsulam dependências externas. A próxima evolução natural, ao adicionar comportamento novo, é usar dentro de cada contexto as pastas `domain/`, `application/`, `infrastructure/` e `presentation/`, sem misturar regras de negócio com Prisma ou HTTP.

## Web (`web/src`)

```text
features/                 # capacidades de negócio: admin, tipster, sportsbook
pages/ e screens/         # composição e apresentação das rotas
shared/
  lib/                    # API client, autenticação, hooks e utilitários reutilizáveis
  components/             # componentes compartilhados
  layout/                 # casca da aplicação e navegação
App.tsx                   # composição de rotas e providers
```

No frontend, DDD se traduz em módulos por funcionalidade. Uma feature contém sua UI e integração própria; `shared` só guarda código sem regra de negócio específica. Isso evita, por exemplo, que a IA Tipster dependa da implementação de Admin ou que telas diferentes criem vários clientes de API.

## Regras de dependência

- `shared` não importa de `features`, `pages` ou `screens`.
- Uma feature não deve importar detalhes internos de outra; compartilhe apenas contratos estáveis em `shared`.
- A API expõe dependências de um contexto pelo seu módulo Nest, não pelo Prisma diretamente.
- Integrações externas ficam em adapters/providers, deixando os casos de uso testáveis.

Essa separação reduz acoplamento, deixa os testes menores e torna mais seguro alterar ou substituir infraestrutura, como provedores de pagamento, IA ou banco de dados.
