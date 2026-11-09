# Desenvolvimento Web Full – Entrega 2

O back-end desta entrega está na pasta [`Backend`](Backend) (API Node.js + Express + MySQL); o front-end fica em [`src/Frontend`](../../../src/Frontend) (React + Vite). A aplicação publicada está em <https://gestaotrocaticket.com.br>, e as telas em produção estão em [`Telas`](Telas), em versão desktop e mobile.

## Requisitos da entrega e onde estão

| Requisito                          | Onde                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| API com as operações principais    | Rotas em [`Backend/src/app.js`](Backend/src/app.js); listar, detalhar, criar, editar e remover         |
| Persistência em banco              | MySQL 8, script em [`Backend/database/database.sql`](Backend/database/database.sql)                    |
| Autenticação e rotas protegidas    | Cadastro e login com JWT; cada rota confere o perfil (administrador, organizador ou fornecedor)        |
| Validação e erros padronizados     | JSON Schema nas entradas; erros com `code`, `description` e `translation` e status HTTP coerentes      |
| Variáveis sensíveis fora do código | Senhas e chaves no Secret Manager; o repositório só tem o `local.env` de desenvolvimento, sem segredos |
| Aplicação publicada                | Front e API no Google Cloud Run, banco MySQL gerenciado (Aiven)                                        |
| Tempo real                         | Notificações e chat por proposta via WebSocket (`/event_planning/ws`), além das rotas REST             |
| Testes                             | 320+ testes de integração (`npm test` em `Backend`) e as collections do Postman abaixo                 |

## Collections do Postman

São duas collections com o mesmo fluxo, cada uma já apontando para o seu servidor:

| Arquivo                                                                                        | Servidor                                                  |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`TrocaTicket_local.postman_collection.json`](TrocaTicket_local.postman_collection.json)       | API local, em `http://localhost:3300/event_planning`      |
| [`TrocaTicket_producao.postman_collection.json`](TrocaTicket_producao.postman_collection.json) | API publicada, a mesma usada por gestaotrocaticket.com.br |

Cada execução cria dados novos e passa por:

1. Autocadastro do organizador e do fornecedor, aviso ao administrador e aprovação
2. Login dos perfis e erros de autenticação (senha errada, sem token, perfil errado)
3. CRUD do evento, com erro de validação e evento inexistente
4. Itens de custo, custos próprios (inclusive variável) e publicação para cotação
5. Fornecedor vê o evento, envia, edita, retira e reenvia a proposta
6. Notificações e chat: aviso de proposta recebida, mensagens, não lidas e lista de chats
7. Organizador compara e seleciona a proposta, confere custo consolidado e ticket e aprova o evento
8. Relatórios e histórico de aprovações do administrador
9. Limpeza: bloqueia os usuários de teste

### Como testar no local

1. Suba a API com o banco (em `Backend`):

   ```bash
   docker compose up -d --build
   npm run setup:local
   ```

2. Crie o administrador local que a collection usa:

   ```bash
   npm run create:admin -- "Admin Local" admin@local.dev senhaForte123
   ```

3. No Postman, importe `TrocaTicket_local.postman_collection.json`.
4. Clique em **Run** (Runner), mantenha a ordem das pastas e rode. Todos os testes devem ficar verdes.

### Como testar em produção

> **Aviso:** para testar em produção é preciso um acesso de administrador da plataforma publicada. A collection não traz credenciais.

1. Importe `TrocaTicket_producao.postman_collection.json`.
2. Na aba **Variables**, preencha `adminEmail` e `adminPassword` (coluna _Current value_) com o acesso de administrador.
3. Clique em **Run** e rode na ordem.

A última pasta bloqueia os usuários de teste, para nada ficar ativo na plataforma.
