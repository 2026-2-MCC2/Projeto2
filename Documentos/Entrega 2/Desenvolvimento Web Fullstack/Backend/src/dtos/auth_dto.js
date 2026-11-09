// nunca devolve id interno nem hash da senha

export class AuthDTO {
  static registration(user) {
    return {
      user_key: user.user_key,
      profile: user.profile,
      status: user.status,
    }
  }

  static registrationStatus(user) {
    const profileData = user.organizer ?? user.supplier ?? null
    const lastDecision = user.status_events?.[0] ?? null

    return {
      profile: user.profile,
      name: user.name,
      cnpj: profileData?.cnpj ?? null,
      categories: user.supplier?.categories?.map((category) => category.name).sort() ?? null,
      submitted_at: user.created_at,
      decided_at: lastDecision?.event_datetime ?? null,
      reason: lastDecision?.reason ?? null,
    }
  }

  static currentUser(user) {
    const profileData = user.organizer ?? user.supplier ?? null

    return {
      user_key: user.user_key,
      name: user.name,
      email: user.email,
      profile: user.profile,
      status: user.status,
      cnpj: profileData?.cnpj ?? null,
      phone: profileData?.phone ?? null,
      responsible_name: profileData?.responsible_name ?? null,
      city: profileData?.city ?? null,
      state: profileData?.state ?? null,
      categories: user.supplier?.categories?.map((category) => category.name).sort() ?? null,
    }
  }

  static login(user, token) {
    return {
      token: token,
      user: {
        user_key: user.user_key,
        name: user.name,
        profile: user.profile,
      },
    }
  }
}
