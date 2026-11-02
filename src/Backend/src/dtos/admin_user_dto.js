// DTO das respostas administrativas: expõe apenas identificadores públicos, nunca id nem password_hash.

export class AdminUserDTO {
  static statusUpdate(user) {
    return {
      user_key: user.user_key,
      status: user.status,
    }
  }

  // Um cadastro do painel de aprovações. cnpj e phone vêm do organizer ou do supplier, conforme o perfil.
  //   { "user_key": "6f1c...", "name": "...", "profile": "organizador", "email": "...", "status": "pending",
  //     "created_at": "2026-11-02T14:31:30.000Z", "cnpj": "11222333000181", "phone": "11999998888" }
  static registration(user) {
    const profileData = user.organizer ?? user.supplier ?? null

    return {
      user_key: user.user_key,
      name: user.name,
      profile: user.profile,
      email: user.email,
      status: user.status,
      created_at: user.created_at,
      cnpj: profileData?.cnpj ?? null,
      phone: profileData?.phone ?? null,
    }
  }

  static registrationList(users) {
    return users.map((user) => AdminUserDTO.registration(user))
  }
}
