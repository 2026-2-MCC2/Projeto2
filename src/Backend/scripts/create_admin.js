// cria o primeiro admin no banco local: o autocadastro não aceita o perfil admin

import { randomUUID } from 'node:crypto'

import mysql from 'mysql2/promise'

import { USER_PROFILES, USER_STATUSES } from '../src/constants.js'
import { SecurityTools } from '../src/utils/security_tools.js'
import { TextTools } from '../src/utils/text_tools.js'
import { LOCAL_DATABASE_URL } from '../tests/utils/local_secrets.js'

const USAGE = 'Uso: npm run create:admin -- "Nome do Admin" admin@empresa.com senhaForte123'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function main() {
  const [rawName, rawEmail, password] = process.argv.slice(2)
  if (!rawName || !rawEmail || !password) {
    return fail(USAGE)
  }

  const name = rawName.trim()
  const email = TextTools.normalizeEmail(rawEmail)

  // mesmos limites do autocadastro (schemas/post_auth_cadastro.json)
  if (name.length === 0 || name.length > 150) {
    return fail('O nome precisa ter de 1 a 150 caracteres.')
  }
  if (email.length > 150 || !EMAIL_PATTERN.test(email)) {
    return fail('Informe um e-mail válido, com até 150 caracteres.')
  }
  if (password.length < 8 || password.length > 72) {
    return fail('A senha precisa ter de 8 a 72 caracteres.')
  }

  const connection = await mysql.createConnection(LOCAL_DATABASE_URL)
  try {
    const [[existingUser]] = await connection.execute('SELECT id FROM user WHERE email = ?', [email])
    if (existingUser !== undefined) {
      console.log(`Já existe um usuário com o e-mail ${email}. Nenhum admin foi criado.`)
      return
    }

    const userKey = randomUUID()
    const passwordHash = await SecurityTools.hashPassword(password)
    await connection.execute(
      `INSERT INTO user (user_key, name, email, password_hash, profile, status, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userKey, name, email, passwordHash, USER_PROFILES.ADMIN, USER_STATUSES.APPROVED, new Date()],
    )

    console.log(`Admin criado: ${name} <${email}> (user_key ${userKey}). Já pode fazer login.`)
  } catch (error) {
    // corrida: outro processo gravou o mesmo e-mail entre a busca e o insert, e o unique barrou
    if (error.code === 'ER_DUP_ENTRY') {
      console.log(`Já existe um usuário com o e-mail ${email}. Nenhum admin foi criado.`)
      return
    }
    throw error
  } finally {
    await connection.end()
  }
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

await main()
