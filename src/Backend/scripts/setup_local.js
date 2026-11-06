import { createLocalSecrets } from '../tests/utils/local_secrets.js'

// o emulador do Secret Manager guarda tudo em memória e começa vazio toda vez que o container sobe
await createLocalSecrets()
console.log('Secrets locais criados no emulador do Secret Manager. A API está pronta para uso.')
