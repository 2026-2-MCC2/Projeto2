import mysql from 'mysql2/promise'
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'

import { LOCAL_DATABASE_URL } from './local_secrets.js'

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? LOCAL_DATABASE_URL

export class DbUtils {
  // passwordHash só é necessário quando o teste faz login com o usuário
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
        await connection.execute('INSERT INTO supplier (user_id, cnpj, phone) VALUES (?, ?, ?)', [user.id, cnpj, '11999999999'])
        await connection.execute(
          `INSERT INTO supplier_category (supplier_id, category_id)
           SELECT supplier.id, item_category.id FROM supplier, item_category
           WHERE supplier.user_id = ? AND item_category.name IN ('Estrutura', 'Segurança')`,
          [user.id],
        )
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
        const [organizers] = await connection.execute(`SELECT id FROM organizer WHERE user_id IN (${idPlaceholders})`, userIds)
        const organizerIds = organizers.map((org) => org.id)
        if (organizerIds.length > 0) {
          const orgPlaceholders = organizerIds.map(() => '?').join(', ')
          await connection.execute(`DELETE FROM event WHERE organizer_id IN (${orgPlaceholders})`, organizerIds)
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
      const [[user]] = await connection.execute(
        'SELECT user_key, name, email, profile, status, approved_at, password_changed_at FROM user WHERE user_key = ?',
        [userKey],
      )
      return user ?? null
    } finally {
      await connection.end()
    }
  }

  static async getOrganizerByUserKey(userKey) {
    return DbUtils.getProfileDataByUserKey('organizer', ['cnpj', 'phone'], userKey)
  }

  // categorias em ordem alfabética
  static async getSupplierByUserKey(userKey) {
    const supplier = await DbUtils.getProfileDataByUserKey('supplier', ['cnpj', 'phone'], userKey)
    if (supplier === null) {
      return null
    }

    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      const [categories] = await connection.execute(
        `SELECT item_category.name
         FROM supplier_category
         INNER JOIN item_category ON item_category.id = supplier_category.category_id
         INNER JOIN supplier ON supplier.id = supplier_category.supplier_id
         INNER JOIN user ON user.id = supplier.user_id
         WHERE user.user_key = ?
         ORDER BY item_category.name`,
        [userKey],
      )
      return { ...supplier, categories: categories.map((category) => category.name) }
    } finally {
      await connection.end()
    }
  }

  // table e columns vêm só do próprio teste, nunca de entrada externa
  static async getProfileDataByUserKey(table, columns, userKey) {
    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      const [[profileData]] = await connection.execute(
        `SELECT ${columns.map((column) => `profile_data.${column}`).join(', ')}
         FROM ${table} AS profile_data
         INNER JOIN user ON user.id = profile_data.user_id
         WHERE user.user_key = ?`,
        [userKey],
      )
      return profileData ?? null
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
        `SELECT history.old_status, history.new_status, history.reason, history.event_datetime, administrator.user_key AS admin_user_key
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

  static async getPasswordResetTokens(userKey) {
    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      const [tokens] = await connection.execute(
        `SELECT reset_token.token_hash, reset_token.expires_at, reset_token.used_at, reset_token.created_at
         FROM password_reset_token AS reset_token
         INNER JOIN user ON user.id = reset_token.user_id
         WHERE user.user_key = ?
         ORDER BY reset_token.id ASC`,
        [userKey],
      )
      return tokens
    } finally {
      await connection.end()
    }
  }

  static async getBudgetItemByKey(itemKey) {
    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      const [[item]] = await connection.execute(
        `SELECT budget_item.budget_item_key AS item_key, event.event_key, item_category.name AS category,
                budget_item.description, budget_item.type, budget_item.quantity, budget_item.estimated_value, budget_item.notes
         FROM budget_item
         INNER JOIN event ON event.id = budget_item.event_id
         INNER JOIN item_category ON item_category.id = budget_item.category_id
         WHERE budget_item.budget_item_key = ?`,
        [itemKey],
      )
      return item ?? null
    } finally {
      await connection.end()
    }
  }

  // cria um link direto no banco, sem passar pela espera entre pedidos; devolve o token do link.
  // as datas usam o relógio do banco em UTC, como a API grava
  static async createPasswordResetToken(userKey, { expiresInSeconds = 3_600 } = {}) {
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      await connection.execute(
        `INSERT INTO password_reset_token (user_id, token_hash, expires_at, created_at)
         SELECT id, ?, UTC_TIMESTAMP() + INTERVAL ? SECOND, UTC_TIMESTAMP() FROM user WHERE user_key = ?`,
        [tokenHash, expiresInSeconds, userKey],
      )
      return token
    } finally {
      await connection.end()
    }
  }

  static async setUserStatus(userKey, status) {
    const connection = await mysql.createConnection(TEST_DATABASE_URL)
    try {
      await connection.execute('UPDATE user SET status = ? WHERE user_key = ?', [status, userKey])
    } finally {
      await connection.end()
    }
  }
}
