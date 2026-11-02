// DTO da resposta administrativa: expõe apenas o identificador público e o status decidido.

export class AdminUserDTO {
  static statusUpdate(user) {
    return {
      user_key: user.user_key,
      status: user.status,
    }
  }
}
