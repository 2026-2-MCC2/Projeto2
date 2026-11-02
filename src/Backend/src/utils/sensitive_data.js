// o que vai para o log nunca pode servir para entrar na conta de alguém nem expor dados pessoais inteiros

const HIDDEN_FIELDS = new Set(['password', 'token', 'document_b64'])

const PARTIALLY_MASKED_FIELDS = {
  email: (value) => maskEmail(value),
  cnpj: (value) => maskEnding(value, 4),
  phone: (value) => maskEnding(value, 4),
}

export function maskEmail(email) {
  const [name, domain] = String(email).split('@')
  return `${name.slice(0, 2)}***@${domain ?? ''}`
}

function maskEnding(value, visibleCharacters) {
  const text = String(value)
  return `***${text.slice(-visibleCharacters)}`
}

export function hideSensitiveData(data) {
  if (Array.isArray(data)) return data.map(hideSensitiveData)
  if (data === null || typeof data !== 'object') return data

  return Object.fromEntries(
    Object.entries(data).map(([field, value]) => {
      if (HIDDEN_FIELDS.has(field)) return [field, 'HIDDEN']
      if (field in PARTIALLY_MASKED_FIELDS && typeof value === 'string') return [field, PARTIALLY_MASKED_FIELDS[field](value)]
      return [field, hideSensitiveData(value)]
    }),
  )
}
