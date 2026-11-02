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

Para aprovar cadastros é preciso um admin, e ninguém vira admin pela API. Crie o primeiro com:

```sh
npm run create:admin -- "Nome do Admin" admin@empresa.com senhaForte123
```

Ele já nasce aprovado e entra pelo `POST /event_planning/auth/login`. Se o e-mail já existir, o script avisa e não cria outro. Se o banco do Docker estiver em outra porta (`DB_PORT`, por exemplo 3307), defina a mesma `DB_PORT` antes de rodar o script e os testes.

## Comandos

| Comando                                      | O que faz                           |
| -------------------------------------------- | ----------------------------------- |
| `docker compose up -d --build`               | sobe a API, o banco e o emulador    |
| `docker compose down`                        | desliga tudo                        |
| `npm run token -- organizador`               | gera um token de teste              |
| `npm run create:admin -- "Nome" email senha` | cria um admin já aprovado           |
| `npm test`                                   | roda os testes (com o Docker no ar) |
| `npm run format`                             | formata o código                    |

## Estrutura

```
requisição -> middlewares -> resource -> controller -> repository -> banco
```

O [`src/app.js`](src/app.js) explica como criar um endpoint novo.

## Deploy

Automático pelo GitHub Actions a cada merge na `main` ([`backend.yml`](../../.github/workflows/backend.yml)).
