import { ForbiddenProfile } from '../errors/index.js'

// conta sem dados de fornecedor recebe 403, como se o perfil não pudesse usar a rota
export async function getSupplierOfUser(userRepository, userKey) {
  const user = await userRepository.getProfileByKey(userKey)
  if (!user?.supplier) {
    throw new ForbiddenProfile()
  }

  return user.supplier
}
