-- Banco da Gestão Troca Ticket (MySQL 8). Estrutura documentada em Documentos/Entrega 2/Projeto em Banco de Dados.

-- o arquivo é UTF-8; sem isto o MySQL do Docker grava os acentos errados
SET NAMES utf8mb4;

-- Recria o banco do zero (apaga os dados existentes).
DROP DATABASE IF EXISTS event_planning;
CREATE DATABASE event_planning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE event_planning;

-- Contas de acesso: admin, organizador ou fornecedor.
CREATE TABLE user(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_key                        CHAR(36) NOT NULL,
    name                            VARCHAR(150) NOT NULL,
    email                           VARCHAR(150) NOT NULL,
    password_hash                   VARCHAR(100) NOT NULL,
    profile                         ENUM('admin', 'organizador', 'fornecedor') NOT NULL,
    status                          ENUM('pending', 'approved', 'rejected', 'blocked') NOT NULL DEFAULT 'pending',
    approved_at                     DATETIME NULL,
    password_changed_at             DATETIME NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_key),
    UNIQUE(email)
);

-- Pedidos de redefinição de senha. Guarda só o hash do token: quem lê o banco não consegue usar o link.
CREATE TABLE password_reset_token(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_id                         INT NOT NULL,
    token_hash                      CHAR(64) NOT NULL,
    expires_at                      DATETIME NOT NULL,
    used_at                         DATETIME NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token_hash),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Histórico das decisões do admin. Sem cascade: um usuário com histórico não pode ser apagado.
CREATE TABLE user_status_event(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_id                         INT NOT NULL,
    admin_user_id                   INT NOT NULL,
    old_status                      ENUM('pending', 'approved', 'rejected', 'blocked') NOT NULL,
    new_status                      ENUM('pending', 'approved', 'rejected', 'blocked') NOT NULL,
    reason                          VARCHAR(500) NULL,
    event_datetime                  DATETIME NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (admin_user_id) REFERENCES user(id)
);

-- Empresa do organizador (1 para 1 com user).
CREATE TABLE organizer(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_id                         INT NOT NULL,
    cnpj                            CHAR(14) NOT NULL,
    phone                           VARCHAR(20) NOT NULL,
    responsible_name                VARCHAR(150) NULL,
    city                            VARCHAR(100) NULL,
    state                           CHAR(2) NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    UNIQUE(cnpj),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Empresa do fornecedor (1 para 1 com user).
CREATE TABLE supplier(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_id                         INT NOT NULL,
    cnpj                            CHAR(14) NOT NULL,
    phone                           VARCHAR(20) NOT NULL,
    responsible_name                VARCHAR(150) NULL,
    city                            VARCHAR(100) NULL,
    state                           CHAR(2) NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    UNIQUE(cnpj),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Evento. profit_margin é uma fração: 0.2000 = 20%.
CREATE TABLE event(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    event_key                       CHAR(36) NOT NULL,
    organizer_id                    INT NOT NULL,
    name                            VARCHAR(150) NOT NULL,
    category                        VARCHAR(80) NOT NULL,
    description                     TEXT NULL,
    venue_name                      VARCHAR(150) NOT NULL,
    address                         VARCHAR(200) NOT NULL,
    city                            VARCHAR(100) NOT NULL,
    state                           CHAR(2) NOT NULL,
    zip_code                        CHAR(8) NULL,
    venue_capacity                  INT NULL,
    start_date                      DATETIME NOT NULL,
    end_date                        DATETIME NOT NULL,
    min_audience                    INT NOT NULL,
    expected_audience               INT NOT NULL,
    max_audience                    INT NOT NULL,
    profit_margin                   DECIMAL(5,4) NOT NULL,
    reference_scenario              ENUM('minimum', 'expected', 'maximum') NOT NULL DEFAULT 'expected',
    status                          ENUM('draft', 'open_for_quotes', 'closed', 'canceled') NOT NULL DEFAULT 'draft',
    cancellation_reason             VARCHAR(500) NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_key),
    FOREIGN KEY (organizer_id) REFERENCES organizer(id),
    CHECK (end_date >= start_date),
    CHECK (min_audience > 0 AND min_audience <= expected_audience AND expected_audience <= max_audience),
    CHECK (venue_capacity IS NULL OR max_audience <= venue_capacity),
    CHECK (profit_margin >= 0 AND profit_margin < 1)
);

-- Custos próprios do evento, sem cotação.
CREATE TABLE internal_cost(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    internal_cost_key               CHAR(36) NOT NULL,
    event_id                        INT NOT NULL,
    type                            ENUM('tax', 'operational', 'other') NOT NULL,
    description                     VARCHAR(255) NOT NULL,
    amount                          DECIMAL(12,2) NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(internal_cost_key),
    FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
    CHECK (amount >= 0)
);

-- Categorias dos itens e das áreas de atuação.
CREATE TABLE item_category(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    name                            VARCHAR(50) NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

INSERT INTO item_category (name) VALUES
    ('Alimentação'),
    ('Bebidas'),
    ('Comunicação'),
    ('Decoração'),
    ('Equipe'),
    ('Estrutura'),
    ('Logística'),
    ('Segurança'),
    ('Tecnologia'),
    ('Outros');

-- Categorias em que cada fornecedor atua (N para N).
CREATE TABLE supplier_category(
    supplier_id                     INT NOT NULL,
    category_id                     INT NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (supplier_id, category_id),
    FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES item_category(id)
);

-- Itens que o evento precisa contratar.
CREATE TABLE budget_item(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    budget_item_key                 CHAR(36) NOT NULL,
    event_id                        INT NOT NULL,
    category_id                     INT NOT NULL,
    description                     VARCHAR(255) NOT NULL,
    type                            ENUM('product', 'service') NOT NULL,
    quantity                        INT NOT NULL,
    estimated_value                 DECIMAL(12,2) NULL,
    notes                           TEXT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(budget_item_key),
    FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES item_category(id),
    CHECK (quantity > 0)
);

-- Proposta de um fornecedor para um item.
CREATE TABLE proposal(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    proposal_key                    CHAR(36) NOT NULL,
    budget_item_id                  INT NOT NULL,
    supplier_id                     INT NOT NULL,
    amount                          DECIMAL(12,2) NOT NULL,
    description                     TEXT NOT NULL,
    not_included                    VARCHAR(500) NULL,
    delivery_terms                  VARCHAR(255) NOT NULL,
    payment_terms                   VARCHAR(255) NOT NULL,
    team                            VARCHAR(255) NULL,
    warranty                        VARCHAR(255) NULL,
    valid_until                     DATE NOT NULL,
    notes                           TEXT NULL,
    status                          ENUM('sent', 'under_review', 'accepted', 'rejected') NOT NULL DEFAULT 'sent',
    selected                        BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at                         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_key),
    UNIQUE(budget_item_id, supplier_id),
    FOREIGN KEY (budget_item_id) REFERENCES budget_item(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES supplier(id),
    CHECK (amount > 0)
);

-- Fotos da proposta (até 5).
CREATE TABLE proposal_photo(
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id                     INT NOT NULL,
    position                        TINYINT NOT NULL,
    url                             VARCHAR(500) NOT NULL,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, position),
    FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE,
    CHECK (position BETWEEN 1 AND 5)
);
