// expõe só identificadores públicos, nunca id nem password_hash

export class AdminUserDTO {
  static statusHistory(rows) {
    return rows.map((row) => ({
      user_key: row.user_key,
      name: row.name,
      email: row.email,
      profile: row.profile,
      old_status: row.old_status,
      new_status: row.new_status,
      reason: row.reason ?? null,
      decided_at: new Date(row.event_datetime).toISOString(),
      admin_name: row.admin_name,
    }))
  }

  static statusUpdate(user) {
    return {
      user_key: user.user_key,
      status: user.status,
    }
  }

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
      responsible_name: profileData?.responsible_name ?? null,
      city: profileData?.city ?? null,
      state: profileData?.state ?? null,
      categories: user.supplier?.categories?.map((category) => category.name).sort() ?? null,
    }
  }

  static registrationList(users) {
    return users.map((user) => AdminUserDTO.registration(user))
  }
}
