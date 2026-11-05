// o que vai para o log nunca pode servir para entrar na conta de alguém nem expor dados pessoais inteiros

// por trecho do nome, para pegar também current_password, new_password, access_token...
const HIDDEN_FIELD_PARTS = ['password', 'token']
const HIDDEN_FIELDS = new Set(['document_b64'])

function isHiddenField(field) {
  const name = field.toLowerCase()
  return HIDDEN_FIELDS.has(name) || HIDDEN_FIELD_PARTS.some((part) => name.includes(part))
}

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
      if (isHiddenField(field)) return [field, 'HIDDEN']
      if (field in PARTIALLY_MASKED_FIELDS && typeof value === 'string') return [field, PARTIALLY_MASKED_FIELDS[field](value)]
      return [field, hideSensitiveData(value)]
    }),
  )
}
