# trocaticket-event-planning-api

API do TrocaTicket para planejamento de eventos. Node.js 24, Express 5 e MySQL 8.

## Como rodar

Precisa de Node.js 24 e Docker.

```sh
npm install
docker compose up -d --build
npm run setup:local
```

A API fica em <http://localhost:3300/event_planning/>.

Rode `npm run setup:local` de novo sempre que subir o Docker.

## Comandos

| Comando                        | O que faz                           |
| ------------------------------ | ----------------------------------- |
| `docker compose up -d --build` | sobe a API, o banco e o emulador    |
| `docker compose down`          | desliga tudo                        |
| `npm run token -- organizador` | gera um token de teste              |
| `npm test`                     | roda os testes (com o Docker no ar) |
| `npm run format`               | formata o código                    |

## Estrutura

```
requisição -> middlewares -> resource -> controller -> repository -> banco
```

O [`src/app.js`](src/app.js) explica como criar um endpoint novo. A `sample_entity` é um exemplo para usar de modelo.

## Deploy

Automático pelo GitHub Actions a cada merge na `main` ([`backend.yml`](../../.github/workflows/backend.yml)).
