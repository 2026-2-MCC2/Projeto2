# Banco de dados

Banco MySQL 8 Gestão Troca Ticket.

As tabelas são criadas pelo [`database.sql`](database.sql) (cópia do [original no backend](../../../src/Backend/database/database.sql), que é o usado pela API) e seguem o [modelo lógico da Entrega 1](../../Entrega%201/Projeto%20em%20Banco%20de%20Dados).

## Relacionamentos

| Tabela          | Relação    | Tabela          | Cardinalidade |
| --------------- | ---------- | --------------- | ------------- |
| `user`          | é          | `organizer`     | 1 : 0..1      |
| `user`          | é          | `supplier`      | 1 : 0..1      |
| `organizer`     | cria       | `event`         | 1 : N         |
| `event`         | possui     | `internal_cost` | 1 : N         |
| `event`         | possui     | `budget_item`   | 1 : N         |
| `item_category` | classifica | `budget_item`   | 1 : N         |
| `budget_item`   | recebe     | `proposal`      | 1 : N         |
| `supplier`      | envia      | `proposal`      | 1 : N         |

- Cada usuário é organizador **ou** fornecedor, conforme o `profile`. O administrador só tem a linha em `user`.
- Um evento tem vários custos internos e vários itens de orçamento.
- Cada item recebe propostas de vários fornecedores, mas no máximo uma de cada fornecedor.
- Apagar um evento apaga junto os custos, os itens e as propostas dele (`ON DELETE CASCADE`).

## Correspondência com o modelo lógico

Mesmas entidades e relacionamentos do modelo, com nomes em inglês (padrão do backend):

| Modelo lógico    | Tabela          |
| ---------------- | --------------- |
| `Usuario`        | `user`          |
| `Organizador`    | `organizer`     |
| `Fornecedor`     | `supplier`      |
| `Evento`         | `event`         |
| `Custo_interno`  | `internal_cost` |
| `Categoria_item` | `item_category` |
| `Item_orcamento` | `budget_item`   |
| `Proposta`       | `proposal`      |

Os atributos seguem a mesma tradução (ex.: `data_inicio` → `start_date`). Além do modelo, foram adicionados:

- `created_at` e chave pública `<tabela>_key`;
- `UNIQUE`, `CHECK` e `ENUM` para validar os dados;
- FK simples (`organizer_id`, `supplier_id`) no lugar das chaves compostas do modelo.

## Tabelas

Toda tabela tem `id` (`INT`, chave primária, gerada automaticamente) e `created_at` (`TIMESTAMP`, data de criação). As tabelas que aparecem na API também têm uma chave pública `<tabela>_key` (`CHAR(36)`, UUID), usada nas URLs no lugar do `id`.

**PK** = chave primária, **FK** = chave estrangeira, **UK** = valor único.

### user

Todos que acessam o sistema. O cadastro nasce `pending` e só entra no sistema depois que o administrador aprova.

| Campo           | Tipo                                     | Regras                       |
| --------------- | ---------------------------------------- | ---------------------------- |
| `id`            | INT                                      | PK                           |
| `user_key`      | CHAR(36)                                 | UK                           |
| `name`          | VARCHAR(150)                             | obrigatório                  |
| `email`         | VARCHAR(150)                             | UK                           |
| `password_hash` | VARCHAR(100)                             | hash da senha, nunca a senha |
| `profile`       | ENUM('admin','organizador','fornecedor') | obrigatório                  |
| `status`        | ENUM('pending','approved','rejected')    | padrão `pending`             |
| `approved_at`   | DATETIME                                 | opcional, data da aprovação  |

### organizer

Dados do usuário organizador (1 para 1 com `user`).

| Campo     | Tipo        | Regras             |
| --------- | ----------- | ------------------ |
| `id`      | INT         | PK                 |
| `user_id` | INT         | FK → `user.id`, UK |
| `cnpj`    | CHAR(14)    | UK, só os números  |
| `phone`   | VARCHAR(20) | obrigatório        |

### supplier

Dados do usuário fornecedor (1 para 1 com `user`).

| Campo          | Tipo         | Regras                             |
| -------------- | ------------ | ---------------------------------- |
| `id`           | INT          | PK                                 |
| `user_id`      | INT          | FK → `user.id`, UK                 |
| `cnpj`         | CHAR(14)     | UK, só os números                  |
| `service_area` | VARCHAR(100) | área de atuação (ex.: alimentação) |
| `phone`        | VARCHAR(20)  | obrigatório                        |

### event

Evento criado por um organizador.

| Campo           | Tipo                                                | Regras                                    |
| --------------- | --------------------------------------------------- | ----------------------------------------- |
| `id`            | INT                                                 | PK                                        |
| `event_key`     | CHAR(36)                                            | UK                                        |
| `organizer_id`  | INT                                                 | FK → `organizer.id`                       |
| `name`          | VARCHAR(150)                                        | obrigatório                               |
| `location`      | VARCHAR(200)                                        | obrigatório                               |
| `start_date`    | DATETIME                                            | obrigatório                               |
| `end_date`      | DATETIME                                            | maior ou igual a `start_date`             |
| `min_audience`  | INT                                                 | maior que 0                               |
| `max_audience`  | INT                                                 | maior ou igual a `min_audience`           |
| `profit_margin` | DECIMAL(5,4)                                        | fração de 0 até menos de 1 (0.2000 = 20%) |
| `status`        | ENUM('draft','open_for_quotes','closed','canceled') | padrão `draft`                            |

A margem entra no cálculo do ticket: `ticket = custo total / [público × (1 − margem)]`. Por isso ela não pode ser 1, que daria divisão por zero.

### internal_cost

Custos do próprio evento, que não passam por cotação (impostos, taxas, operação).

| Campo               | Tipo                      | Regras             |
| ------------------- | ------------------------- | ------------------ |
| `id`                | INT                       | PK                 |
| `internal_cost_key` | CHAR(36)                  | UK                 |
| `event_id`          | INT                       | FK → `event.id`    |
| `type`              | ENUM('tax','operational') | obrigatório        |
| `description`       | VARCHAR(255)              | obrigatório        |
| `amount`            | DECIMAL(12,2)             | maior ou igual a 0 |

### item_category

Categorias dos itens de orçamento. Já nasce com Estrutura, Alimentação, Segurança e Outros.

| Campo  | Tipo        | Regras |
| ------ | ----------- | ------ |
| `id`   | INT         | PK     |
| `name` | VARCHAR(50) | UK     |

### budget_item

Item que o evento precisa contratar e que os fornecedores cotam (ex.: palco, buffet).

| Campo             | Tipo                      | Regras                              |
| ----------------- | ------------------------- | ----------------------------------- |
| `id`              | INT                       | PK                                  |
| `budget_item_key` | CHAR(36)                  | UK                                  |
| `event_id`        | INT                       | FK → `event.id`                     |
| `category_id`     | INT                       | FK → `item_category.id`             |
| `description`     | VARCHAR(255)              | obrigatório                         |
| `type`            | ENUM('product','service') | obrigatório                         |
| `quantity`        | INT                       | maior que 0                         |
| `estimated_value` | DECIMAL(12,2)             | opcional, estimativa do organizador |

### proposal

Proposta de um fornecedor para um item de orçamento. A proposta com `selected` verdadeiro é a escolhida pelo organizador e entra no custo total do evento.

| Campo            | Tipo                               | Regras                |
| ---------------- | ---------------------------------- | --------------------- |
| `id`             | INT                                | PK                    |
| `proposal_key`   | CHAR(36)                           | UK                    |
| `budget_item_id` | INT                                | FK → `budget_item.id` |
| `supplier_id`    | INT                                | FK → `supplier.id`    |
| `amount`         | DECIMAL(12,2)                      | maior que 0           |
| `description`    | TEXT                               | obrigatório           |
| `valid_until`    | DATE                               | validade da proposta  |
| `notes`          | TEXT                               | opcional              |
| `status`         | ENUM('sent','accepted','rejected') | padrão `sent`         |
| `selected`       | BOOLEAN                            | padrão falso          |
| `sent_at`        | TIMESTAMP                          | data de envio         |

O par (`budget_item_id`, `supplier_id`) é único: cada fornecedor manda uma proposta por item.
