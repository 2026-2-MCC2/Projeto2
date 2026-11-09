// proposal_photo.url é VARCHAR(500)
const MAX_OBJECT_PATH_LENGTH = 500

// sem ".." nem "/" no começo, para o caminho não sair da pasta local
const OBJECT_PATH_PATTERN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.[A-Za-z0-9]{1,10}$/

export function assertValidObjectPath(path) {
  if (typeof path !== 'string' || path.length > MAX_OBJECT_PATH_LENGTH || !OBJECT_PATH_PATTERN.test(path)) {
    throw new Error(`Invalid storage object path: ${JSON.stringify(path)}`)
  }
}

// tipo do arquivo pela extensão, para a pasta local servir a foto com o Content-Type certo
const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function contentTypeOf(path) {
  const extension = path.split('.').pop().toLowerCase()
  return CONTENT_TYPES[extension] ?? 'application/octet-stream'
}
