// Busca o fornecedor do usuário logado, usado pelas rotas do módulo Fornecedor.
// Conta sem dados de fornecedor recebe 403, como se o perfil não pudesse usar a rota.

import { ForbiddenProfile } from '../errors/index.js'

export async function getSupplierOfUser(userRepository, userKey) {
  const user = await userRepository.getProfileByKey(userKey)
  if (!user?.supplier) {
    throw new ForbiddenProfile()
  }

  return user.supplier
}
