// Gera um token de login de teste para chamar a API na mão (Postman, curl), enquanto o endpoint de
// login ainda não existe. Funciona só no ambiente local, porque usa a chave local do JWT.
//
//   npm run token                  token de um organizador
//   npm run token -- admin         token de um admin
//   npm run token -- fornecedor    token de um fornecedor
//
// Use o token no header de cada requisição:
//   Authorization: Bearer <token>
// No Postman: aba Authorization > Type: Bearer Token > cole o token.

import { USER_PROFILES } from '../src/constants.js'
import { TokenGenerator } from '../tests/utils/token_generator.js'

const profile = process.argv[2] ?? USER_PROFILES.ORGANIZER

const validProfiles = Object.values(USER_PROFILES)
if (!validProfiles.includes(profile)) {
  console.error(`Perfil "${profile}" não existe. Use um destes: ${validProfiles.join(', ')}`)
  process.exit(1)
}

console.log(TokenGenerator.create(profile, { expiresIn: '8h' }))
