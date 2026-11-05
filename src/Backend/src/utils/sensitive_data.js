// o que vai para o log nunca pode servir para entrar na conta de alguém nem expor dados pessoais inteiros

// por trecho do nome, para pegar também current_password, new_password, access_token...
const HIDDEN_FIELD_PARTS = ['password', 'token']
const HIDDEN_FIELDS = new Set(['document_b64'])

function isHiddenField(field) {
  const name = field.toLowerCase()
  return HIDDEN_FIELDS.has(name) || HIDDEN_FIELD_PARTS.some((part) => name.includes(part))
}

// vale também com prefixo, como supplier_cnpj e contact_email
const PARTIALLY_MASKED_FIELDS = {
  email: (value) => maskEmail(value),
  cnpj: (value) => maskEnding(value, 4),
  phone: (value) => maskEnding(value, 4),
  // a assinatura da URL de leitura da foto fica na query string: quem a copiasse do log abriria a foto
  url: (value) => `${value.split('?')[0]}?HIDDEN`,
}

export function maskEmail(email) {
  const [name, domain] = String(email).split('@')
  return `${name.slice(0, 2)}***@${domain ?? ''}`
}

function maskEnding(value, visibleCharacters) {
  const text = String(value)
  return `***${text.slice(-visibleCharacters)}`
}

function findPartialMask(field) {
  const name = field.toLowerCase()
  const maskedField = Object.keys(PARTIALLY_MASKED_FIELDS).find((key) => name === key || name.endsWith(`_${key}`))
  return maskedField === undefined ? null : PARTIALLY_MASKED_FIELDS[maskedField]
}

export function hideSensitiveData(data) {
  if (Array.isArray(data)) return data.map(hideSensitiveData)
  if (data === null || typeof data !== 'object') return data

  return Object.fromEntries(
    Object.entries(data).map(([field, value]) => {
      if (isHiddenField(field)) return [field, 'HIDDEN']
      const partialMask = findPartialMask(field)
      if (partialMask !== null && typeof value === 'string') return [field, partialMask(value)]
      return [field, hideSensitiveData(value)]
    }),
  )
}
