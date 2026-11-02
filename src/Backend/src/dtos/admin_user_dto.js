// expõe só identificadores públicos, nunca id nem password_hash

export class AdminUserDTO {
  static statusUpdate(user) {
    return {
      user_key: user.user_key,
      status: user.status,
    }
  }

  // categories é null para organizador
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
      categories: user.supplier?.categories?.map((category) => category.name).sort() ?? null,
    }
  }

  static registrationList(users) {
    return users.map((user) => AdminUserDTO.registration(user))
  }
}
