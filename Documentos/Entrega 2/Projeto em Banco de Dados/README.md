# Banco de dados

Banco **MySQL 8** da Gestão Troca Ticket, com 12 tabelas. O script de criação está em [`database.sql`](database.sql) e segue o [modelo da Entrega 1](../../Entrega%201/Projeto%20em%20Banco%20de%20Dados).

## Como as tabelas se ligam

| Tabela          | Relação       | Tabela                 | Cardinalidade |
| --------------- | ------------- | ---------------------- | ------------- |
| `user`          | é             | `organizer`            | 1 : 0..1      |
| `user`          | é             | `supplier`             | 1 : 0..1      |
| `user`          | tem histórico | `user_status_event`    | 1 : N         |
| `user`          | pede          | `password_reset_token` | 1 : N         |
| `supplier`      | atua em       | `item_category`        | N : N         |
| `organizer`     | cria          | `event`                | 1 : N         |
| `event`         | possui        | `internal_cost`        | 1 : N         |
| `event`         | possui        | `budget_item`          | 1 : N         |
| `item_category` | classifica    | `budget_item`          | 1 : N         |
| `budget_item`   | recebe        | `proposal`             | 1 : N         |
| `supplier`      | envia         | `proposal`             | 1 : N         |
| `proposal`      | tem           | `proposal_photo`       | 1 : N         |

## Do modelo da Entrega 1 para o banco

As entidades do modelo foram mantidas, com nomes em inglês (padrão do código):

| Modelo           | Tabela          |
| ---------------- | --------------- |
| `Usuario`        | `user`          |
| `Organizador`    | `organizer`     |
| `Fornecedor`     | `supplier`      |
| `Evento`         | `event`         |
| `Custo_interno`  | `internal_cost` |
| `Categoria_item` | `item_category` |
| `Item_orcamento` | `budget_item`   |
| `Proposta`       | `proposal`      |

Quatro tabelas novas surgiram na implementação:

- `user_status_event`: histórico de quem aprovou, rejeitou ou bloqueou cada cadastro, e por quê.
- `supplier_category`: o fornecedor pode atuar em várias categorias (antes era uma só).
- `proposal_photo`: fotos de trabalhos anteriores anexadas à proposta.
- `password_reset_token`: links de "Esqueceu sua senha?" enviados por e-mail.

## Tabelas

Toda tabela tem `id` (chave primária, gerada automaticamente) e `created_at` (data de criação). As tabelas usadas pela API também têm uma chave pública `<tabela>_key` (UUID), que vai nas URLs no lugar do `id`. Esses campos não se repetem abaixo.

**FK** = chave estrangeira · **único** = não pode repetir.

### user

Todos que acessam o sistema. O cadastro começa pendente até o administrador aprovar.

| Campo                 | Tipo                                       | Regra                    |
| --------------------- | ------------------------------------------ | ------------------------ |
| `name`                | VARCHAR(150)                               | obrigatório              |
| `email`               | VARCHAR(150)                               | único                    |
| `password_hash`       | VARCHAR(100)                               | só o hash, nunca a senha |
| `profile`             | ENUM(admin, organizador, fornecedor)       | obrigatório              |
| `status`              | ENUM(pending, approved, rejected, blocked) | começa em `pending`      |
| `approved_at`         | DATETIME                                   | opcional                 |
| `password_changed_at` | DATETIME                                   | última troca de senha    |

### user_status_event

Cada decisão do administrador sobre um cadastro.

| Campo            | Tipo                    | Regra                                       |
| ---------------- | ----------------------- | ------------------------------------------- |
| `user_id`        | INT                     | FK → `user` (quem foi decidido)             |
| `admin_user_id`  | INT                     | FK → `user` (quem decidiu)                  |
| `old_status`     | ENUM (mesmos do `user`) | obrigatório                                 |
| `new_status`     | ENUM (mesmos do `user`) | obrigatório                                 |
| `reason`         | VARCHAR(500)            | motivo, obrigatório ao rejeitar ou bloquear |
| `event_datetime` | DATETIME                | quando foi decidido                         |

### password_reset_token

Link de redefinição de senha. Guarda só o hash do token enviado por e-mail; o link vence em 1 hora e só pode ser usado uma vez.

| Campo        | Tipo     | Regra                     |
| ------------ | -------- | ------------------------- |
| `user_id`    | INT      | FK → `user`               |
| `token_hash` | CHAR(64) | único, SHA-256 do token   |
| `expires_at` | DATETIME | quando o link vence       |
| `used_at`    | DATETIME | quando foi usado, ou nulo |

### organizer e supplier

Dados da empresa do organizador e do fornecedor. As duas tabelas têm os mesmos campos.

| Campo              | Tipo         | Regra                 |
| ------------------ | ------------ | --------------------- |
| `user_id`          | INT          | FK → `user`, único    |
| `cnpj`             | CHAR(14)     | único, só os números  |
| `phone`            | VARCHAR(20)  | obrigatório           |
| `responsible_name` | VARCHAR(150) | opcional              |
| `city`             | VARCHAR(100) | opcional              |
| `state`            | CHAR(2)      | opcional, sigla da UF |

### item_category e supplier_category

`item_category` guarda as categorias, que já vêm cadastradas: Alimentação, Bebidas, Comunicação, Decoração, Equipe, Estrutura, Logística, Segurança, Tecnologia e Outros.

| Campo  | Tipo        | Regra |
| ------ | ----------- | ----- |
| `name` | VARCHAR(50) | único |

`supplier_category` liga cada fornecedor às categorias em que atua. A chave primária é o par dos dois campos.

| Campo         | Tipo | Regra                |
| ------------- | ---- | -------------------- |
| `supplier_id` | INT  | FK → `supplier`      |
| `category_id` | INT  | FK → `item_category` |

### event

Evento criado por um organizador.

| Campo                | Tipo                                           | Regra                              |
| -------------------- | ---------------------------------------------- | ---------------------------------- |
| `organizer_id`       | INT                                            | FK → `organizer`                   |
| `name`               | VARCHAR(150)                                   | obrigatório                        |
| `category`           | VARCHAR(80)                                    | tipo do evento (ex.: festival)     |
| `description`        | TEXT                                           | opcional                           |
| `venue_name`         | VARCHAR(150)                                   | nome do espaço                     |
| `address`            | VARCHAR(200)                                   | obrigatório                        |
| `city` / `state`     | VARCHAR(100) / CHAR(2)                         | obrigatórios                       |
| `zip_code`           | CHAR(8)                                        | opcional                           |
| `venue_capacity`     | INT                                            | opcional                           |
| `start_date`         | DATETIME                                       | obrigatório                        |
| `end_date`           | DATETIME                                       | não pode ser antes do início       |
| `min_audience`       | INT                                            | maior que 0                        |
| `expected_audience`  | INT                                            | entre o mínimo e o máximo          |
| `max_audience`       | INT                                            | até a capacidade do espaço         |
| `profit_margin`      | DECIMAL(5,4)                                   | de 0 até menos de 1 (0.2000 = 20%) |
| `reference_scenario` | ENUM(minimum, expected, maximum)               | começa em `expected`               |
| `status`             | ENUM(draft, open_for_quotes, closed, canceled) | começa em `draft`                  |

A margem entra no cálculo do ticket: `ticket = custo total ÷ [público × (1 − margem)]`.

### internal_cost

Custos do próprio evento, que não passam por cotação.

| Campo         | Tipo                          | Regra              |
| ------------- | ----------------------------- | ------------------ |
| `event_id`    | INT                           | FK → `event`       |
| `type`        | ENUM(tax, operational, other) | obrigatório        |
| `description` | VARCHAR(255)                  | obrigatório        |
| `amount`      | DECIMAL(12,2)                 | maior ou igual a 0 |

### budget_item

Item que o evento precisa contratar e que os fornecedores cotam.

| Campo             | Tipo                   | Regra                |
| ----------------- | ---------------------- | -------------------- |
| `event_id`        | INT                    | FK → `event`         |
| `category_id`     | INT                    | FK → `item_category` |
| `description`     | VARCHAR(255)           | obrigatório          |
| `type`            | ENUM(product, service) | obrigatório          |
| `quantity`        | INT                    | maior que 0          |
| `estimated_value` | DECIMAL(12,2)          | opcional             |
| `notes`           | TEXT                   | opcional             |

### proposal

Proposta de um fornecedor para um item. Cada fornecedor manda uma proposta por item.

| Campo            | Tipo                                         | Regra                 |
| ---------------- | -------------------------------------------- | --------------------- |
| `budget_item_id` | INT                                          | FK → `budget_item`    |
| `supplier_id`    | INT                                          | FK → `supplier`       |
| `amount`         | DECIMAL(12,2)                                | maior que 0           |
| `description`    | TEXT                                         | obrigatório           |
| `not_included`   | VARCHAR(500)                                 | opcional              |
| `delivery_terms` | VARCHAR(255)                                 | prazo de entrega      |
| `payment_terms`  | VARCHAR(255)                                 | condição de pagamento |
| `team`           | VARCHAR(255)                                 | opcional              |
| `warranty`       | VARCHAR(255)                                 | opcional              |
| `valid_until`    | DATE                                         | validade da proposta  |
| `notes`          | TEXT                                         | opcional              |
| `status`         | ENUM(sent, under_review, accepted, rejected) | começa em `sent`      |
| `selected`       | BOOLEAN                                      | proposta escolhida    |

### proposal_photo

Até 5 fotos por proposta.

| Campo         | Tipo         | Regra                 |
| ------------- | ------------ | --------------------- |
| `proposal_id` | INT          | FK → `proposal`       |
| `position`    | TINYINT      | de 1 a 5, sem repetir |
| `url`         | VARCHAR(500) | endereço do arquivo   |

Apagar um evento apaga junto seus custos, itens, propostas e fotos.
