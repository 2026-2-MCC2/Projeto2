-- Cria as tabelas do banco (MySQL 8).
--
-- Local: roda sozinho na primeira vez que o container "db" sobe. Se você mudar este arquivo,
-- recrie o banco para ele rodar de novo (isso apaga os dados locais):
--   docker compose down -v && docker compose up -d --build
-- Produção: rode uma vez no Cloud SQL (pelo Cloud SQL Studio no console do Google Cloud).
--
-- Toda tabela daqui precisa de um model correspondente em src/models/ (é por ele que o código
-- conhece as colunas).
--
-- ATENÇÃO À CHAVE ESTRANGEIRA NO MYSQL
-- No MySQL, escrever "REFERENCES" na mesma linha da coluna NÃO cria a chave estrangeira: o MySQL
-- aceita o comando e ignora a regra, sem avisar. Sempre declare a chave no fim da tabela, assim:
--   FOREIGN KEY (status_id) REFERENCES sample_entity_status(id)
--
-- As tabelas abaixo são o EXEMPLO do boilerplate (usadas pelos testes). Quando criarem as tabelas do
-- TrocaTicket, sigam o mesmo formato.

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
