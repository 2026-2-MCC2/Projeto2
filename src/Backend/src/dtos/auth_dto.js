// DTO das respostas de autenticação: expõe só o identificador público, o perfil e o status.
// Nunca devolve id interno, senha ou hash.

export class AuthDTO {
  static registration(user) {
    return {
      user_key: user.user_key,
      profile: user.profile,
      status: user.status,
    }
  }
}
