-- Cria as tabelas do banco (MySQL 8).
--
-- Local: roda sozinho na primeira vez que o container "db" sobe. Se você mudar este arquivo,
-- recrie o banco para ele rodar de novo (isso apaga os dados locais):
--   docker compose down -v && docker compose up -d --build
--
-- Toda tabela daqui precisa de um model correspondente em src/models/ (é por ele que o código
-- conhece as colunas).
--
-- As três primeiras tabelas são o EXEMPLO do boilerplate (usadas pelos testes). As do TrocaTicket
-- vêm depois e seguem o mesmo formato.

-- Status possíveis de uma entidade. Já nasce preenchida.
CREATE TABLE sample_entity_status(
    id                              INT AUTO_INCREMENT PRIMARY KEY, -- AUTO_INCREMENT: número gerado automaticamente (1, 2, 3...)
    enumerator                      VARCHAR(50) NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(enumerator)
);

INSERT INTO sample_entity_status (enumerator) VALUES
    ('created'),
    ('pending'),
    ('success'),
    ('failed');

-- A entidade de exemplo.
CREATE TABLE sample_entity(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    sample_entity_key               CHAR(36) NOT NULL,          -- chave pública (UUID) usada nas URLs da API
    status_id                       INT NOT NULL,
    sample_entity_data              JSON NOT NULL,              -- JSON: guarda um objeto JSON (o body do POST)
    counter                         INT NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sample_entity_key),
    -- FOREIGN KEY: só aceita um status_id que existe na tabela sample_entity_status
    FOREIGN KEY (status_id) REFERENCES sample_entity_status(id)
);

-- Histórico: uma linha para cada mudança de status de uma entidade.
CREATE TABLE sample_entity_status_event(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    sample_entity_id                INT NOT NULL,
    status_id                       INT NOT NULL,
    event_datetime                  DATETIME NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sample_entity_id) REFERENCES sample_entity(id),
    FOREIGN KEY (status_id) REFERENCES sample_entity_status(id)
);

-- ============================================================================================
-- TROCATICKET
-- ============================================================================================

-- Toda pessoa que acessa o sistema: administrador, organizador ou fornecedor.
-- O cadastro nasce "pending" e só entra no sistema depois que o administrador aprova.
CREATE TABLE user(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_key                        CHAR(36) NOT NULL,          -- chave pública (UUID) usada nas URLs da API
    name                            VARCHAR(150) NOT NULL,
    email                           VARCHAR(150) NOT NULL,
    password_hash                   VARCHAR(100) NOT NULL,      -- nunca a senha: só o hash (SecurityTools.hashPassword)
    profile                         ENUM('admin', 'organizador', 'fornecedor') NOT NULL, -- mesmos valores de USER_PROFILES (src/constants.js)
    status                          ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_at                     DATETIME NULL,              -- preenchida quando o administrador aprova
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_key),
    UNIQUE(email)
);

-- Dados do usuário com perfil organizador (1 para 1 com user).
CREATE TABLE organizer(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_id                         INT NOT NULL,
    cnpj                            CHAR(14) NOT NULL,          -- só os 14 números, sem pontos e barra
    phone                           VARCHAR(20) NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),                                            -- UNIQUE na FK: cada usuário tem no máximo um organizador
    UNIQUE(cnpj),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Dados do usuário com perfil fornecedor (1 para 1 com user).
CREATE TABLE supplier(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_id                         INT NOT NULL,
    cnpj                            CHAR(14) NOT NULL,
    service_area                    VARCHAR(100) NOT NULL,      -- área de atuação (ex.: alimentação, segurança)
    phone                           VARCHAR(20) NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    UNIQUE(cnpj),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Evento criado por um organizador.
-- profit_margin é uma fração: 0.2000 = 20%. Entra no cálculo do ticket:
--   ticket = custo total / [público × (1 - margem)]
CREATE TABLE event(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    event_key                       CHAR(36) NOT NULL,
    organizer_id                    INT NOT NULL,
    name                            VARCHAR(150) NOT NULL,
    location                        VARCHAR(200) NOT NULL,
    start_date                      DATETIME NOT NULL,
    end_date                        DATETIME NOT NULL,
    min_audience                    INT NOT NULL,
    max_audience                    INT NOT NULL,
    profit_margin                   DECIMAL(5,4) NOT NULL,
    status                          ENUM('draft', 'open_for_quotes', 'closed', 'canceled') NOT NULL DEFAULT 'draft',
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_key),
    FOREIGN KEY (organizer_id) REFERENCES organizer(id),
    -- CHECK: o MySQL recusa a linha se a condição for falsa
    CHECK (end_date >= start_date),
    CHECK (min_audience > 0 AND max_audience >= min_audience),
    CHECK (profit_margin >= 0 AND profit_margin < 1)           -- margem 1 (100%) daria divisão por zero no ticket
);

-- Custos do próprio evento, que não passam por cotação (impostos, taxas, operação).
CREATE TABLE internal_cost(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    internal_cost_key               CHAR(36) NOT NULL,
    event_id                        INT NOT NULL,
    type                            ENUM('tax', 'operational') NOT NULL,
    description                     VARCHAR(255) NOT NULL,
    amount                          DECIMAL(12,2) NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(internal_cost_key),
    -- ON DELETE CASCADE: apagar o evento apaga os custos dele junto
    FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
    CHECK (amount >= 0)
);

-- Categorias dos itens de orçamento. Já nasce preenchida.
CREATE TABLE item_category(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    name                            VARCHAR(50) NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

INSERT INTO item_category (name) VALUES
    ('Estrutura'),
    ('Alimentação'),
    ('Segurança'),
    ('Outros');

-- Item que o evento precisa contratar e que os fornecedores cotam (ex.: palco, buffet).
CREATE TABLE budget_item(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    budget_item_key                 CHAR(36) NOT NULL,
    event_id                        INT NOT NULL,
    category_id                     INT NOT NULL,
    description                     VARCHAR(255) NOT NULL,
    type                            ENUM('product', 'service') NOT NULL,
    quantity                        INT NOT NULL,
    estimated_value                 DECIMAL(12,2) NULL,         -- estimativa do organizador antes das propostas
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(budget_item_key),
    FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES item_category(id),
    CHECK (quantity > 0)
);

-- Proposta de um fornecedor para um item de orçamento.
-- selected marca a proposta escolhida pelo organizador: é ela que entra no custo total do evento.
CREATE TABLE proposal(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    proposal_key                    CHAR(36) NOT NULL,
    budget_item_id                  INT NOT NULL,
    supplier_id                     INT NOT NULL,
    amount                          DECIMAL(12,2) NOT NULL,
    description                     TEXT NOT NULL,
    valid_until                     DATE NOT NULL,
    notes                           TEXT NULL,
    status                          ENUM('sent', 'accepted', 'rejected') NOT NULL DEFAULT 'sent',
    selected                        BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at                         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_key),
    UNIQUE(budget_item_id, supplier_id),                       -- cada fornecedor manda uma proposta por item
    FOREIGN KEY (budget_item_id) REFERENCES budget_item(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES supplier(id),
    CHECK (amount > 0)
);
