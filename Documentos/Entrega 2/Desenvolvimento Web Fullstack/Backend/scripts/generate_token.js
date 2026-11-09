import { USER_PROFILES } from '../src/constants.js'
import { TokenGenerator } from '../tests/utils/token_generator.js'

const profile = process.argv[2] ?? USER_PROFILES.ORGANIZER

const validProfiles = Object.values(USER_PROFILES)
if (!validProfiles.includes(profile)) {
  console.error(`Perfil "${profile}" não existe. Use um destes: ${validProfiles.join(', ')}`)
  process.exit(1)
}

console.log(TokenGenerator.create(profile, { expiresIn: '8h' }))
