// Acesso direto ao banco nos testes.
//
// DbUtils.rollback() apaga todas as entidades (mantém a tabela de status). Use no começo de um teste
// que precisa do banco vazio, ex.: um teste que conta quantos itens a listagem devolve.

import mysql from 'mysql2/promise'
import { randomInt, randomUUID } from 'node:crypto'

import { LOCAL_DATABASE_URL } from './local_secrets.js'

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? LOCAL_DATABASE_URL

export class DbUtils {
  // passwordHash: use SecurityTools.hashPassword('senha') quando o teste precisar fazer login com o usuário
  static async createUserFixture({
    profile = 'organizador',
    status = 'pending',
    userKey = randomUUID(),
    passwordHash = 'test-password-hash',
  } = {}) {
    const email = `rf03-${userKey}@example.test`
    const connection = await mysql.createConnection(TEST_DATABASE_URL)

    try {
      await connection.beginTransaction()
      await connection.execute(
        `INSERT INTO user (user_key, name, email, password_hash, profile, status, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userKey, 'RF03 Test User', email, passwordHash, profile, status, status === 'approved' ? new Date() : null],
      )

      const [[user]] = await connection.execute('SELECT id FROM user WHERE user_key = ?', [userKey])
      if (profile === 'organizador') {
        const cnpj = Array.from({ length: 14 }, () => randomInt(0, 10)).join('')
        await connection.execute('INSERT INTO organizer (user_id, cnpj, phone) VALUES (?, ?, ?)', [user.id, cnpj, '11999999999'])
      } else if (profile === 'fornecedor') {
        const cnpj = Array.from({ length: 14 }, () => randomInt(0, 10)).join('')
        await connection.execute('INSERT INTO supplier (user_id, cnpj, service_area, phone) VALUES (?, ?, ?, ?)', [
          user.id,
          cnpj,
          'RF03 teste',
          '11999999999',
        ])
      }

      await connection.commit()
      return { userKey: userKey, email: email, profile: profile, status: status }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      await connection.end()
    }
  }

  static async deleteUserFixtures(userKeys) {
    if (userKeys.length === 0) {
      return
    }

    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      await connection.beginTransaction()

      const keyPlaceholders = userKeys.map(() => '?').join(', ')
      const [users] = await connection.execute(`SELECT id FROM user WHERE user_key IN (${keyPlaceholders})`, userKeys)
      const userIds = users.map((user) => user.id)

      if (userIds.length > 0) {
        const idPlaceholders = userIds.map(() => '?').join(', ')
        const [[historyTable]] = await connection.query("SHOW TABLES LIKE 'user_status_event'")
        if (historyTable !== undefined) {
          await connection.execute(
            `DELETE FROM user_status_event
             WHERE user_id IN (${idPlaceholders}) OR admin_user_id IN (${idPlaceholders})`,
            [...userIds, ...userIds],
          )
        }
        await connection.execute(`DELETE FROM user WHERE id IN (${idPlaceholders})`, userIds)
      }

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      await connection.end()
    }
  }

  static async getUserFixture(userKey) {
    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      const [[user]] = await connection.execute('SELECT user_key, name, email, profile, status, approved_at FROM user WHERE user_key = ?', [
        userKey,
      ])
      return user ?? null
    } finally {
      await connection.end()
    }
  }

  static async getOrganizerByUserKey(userKey) {
    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      const [[organizer]] = await connection.execute(
        `SELECT organizer.cnpj, organizer.phone
         FROM organizer
         INNER JOIN user ON user.id = organizer.user_id
         WHERE user.user_key = ?`,
        [userKey],
      )
      return organizer ?? null
    } finally {
      await connection.end()
    }
  }

  static async ensureApprovedTestUser({ userKey, profile }) {
    const existing = await DbUtils.getUserFixture(userKey)
    if (existing !== null) {
      if (
        existing.name !== 'RF03 Test User' ||
        existing.email !== `rf03-${userKey}@example.test` ||
        existing.status !== 'approved' ||
        existing.profile !== profile
      ) {
        throw new Error(`A chave fixa de teste ${userKey} já pertence a outro registro; nenhum dado foi alterado.`)
      }
      return
    }

    await DbUtils.createUserFixture({ userKey, profile, status: 'approved' })
  }

  static async getUserStatusHistory(userKey) {
    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      const [events] = await connection.execute(
        `SELECT history.old_status, history.new_status, history.event_datetime, administrator.user_key AS admin_user_key
         FROM user_status_event AS history
         INNER JOIN user AS affected_user ON affected_user.id = history.user_id
         INNER JOIN user AS administrator ON administrator.id = history.admin_user_id
         WHERE affected_user.user_key = ?
         ORDER BY history.id ASC`,
        [userKey],
      )
      return events
    } finally {
      await connection.end()
    }
  }

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
