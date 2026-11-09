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

## Armazenamento de arquivos

As fotos das propostas ficam fora do banco: a tabela `proposal_photo` guarda só o caminho do objeto (coluna `url`), e a URL de leitura é gerada na hora, com validade curta. O módulo fica em [`src/connectors/storage/`](src/connectors/storage/index.js), com a mesma interface nos dois drivers (`save`, `remove` e `getUrl`).

| Variável                         | Para quê                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `STORAGE_DRIVER`                 | `local` (desenvolvimento e testes) ou `gcs` (produção)                                       |
| `STORAGE_LOCAL_DIR`              | pasta dos arquivos no driver `local` (no Docker, `/tmp/trocaticket-storage`)                 |
| `STORAGE_LOCAL_PUBLIC_URL`       | endereço da rota que serve os arquivos locais (`http://localhost:3300/event_planning/files`) |
| `GCS_BUCKET`                     | nome do bucket privado no driver `gcs`                                                       |
| `STORAGE_URL_EXPIRATION_SECONDS` | validade das URLs de leitura, em segundos (padrão 900 = 15 minutos)                          |

No driver `gcs` a API usa as credenciais padrão do ambiente: no Cloud Run, a service account do serviço. Não há chave JSON no código nem no repositório. Essa service account precisa de acesso aos objetos do bucket e de permissão para assinar em nome de si mesma (é assim que a URL assinada é gerada sem chave privada).

## Estrutura

```
requisição -> middlewares -> resource -> controller -> repository -> banco
```

O [`src/app.js`](src/app.js) explica como criar um endpoint novo.

## Deploy

Automático pelo GitHub Actions a cada merge na `main` ([`backend.yml`](../../.github/workflows/backend.yml)).
