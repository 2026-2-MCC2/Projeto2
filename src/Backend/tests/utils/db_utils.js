// Acesso direto ao banco nos testes.
//
// DbUtils.rollback() apaga todas as entidades (mantém a tabela de status). Use no começo de um teste
// que precisa do banco vazio, ex.: um teste que conta quantos itens a listagem devolve.

import mysql from 'mysql2/promise'

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? `mysql://my_user:my_pwd@localhost:${process.env.DB_PORT ?? 3306}/event_planning`

export class DbUtils {
  static async rollback() {
    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      // O MySQL não deixa apagar tabelas que outras tabelas apontam (chave estrangeira).
      // Por isso apagamos primeiro o histórico, que aponta para a entidade, e depois a entidade.
      await connection.query('DELETE FROM sample_entity_status_event')
      await connection.query('DELETE FROM sample_entity')
    } finally {
      await connection.end()
    }
  }
}
