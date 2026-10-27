// Prepara o ambiente local para usar a API na mão (Postman, curl, front-end).
// Rode depois de "docker compose up -d --build":
//   npm run setup:local
//
// Por que precisa? O emulador do Secret Manager guarda tudo em memória e começa VAZIO toda vez que
// o container sobe. Sem os secrets (senha do banco e chave do JWT), a API não consegue funcionar.
// O "npm test" já faz isso sozinho; este script é para quando você quer usar a API sem rodar os testes.

import { createLocalSecrets } from '../tests/utils/local_secrets.js'

await createLocalSecrets()
console.log('Secrets locais criados no emulador do Secret Manager. A API está pronta para uso.')
