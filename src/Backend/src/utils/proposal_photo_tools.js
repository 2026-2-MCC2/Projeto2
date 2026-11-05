// Ferramentas das fotos das propostas (proposal_photo), usadas pelo fornecedor e pelo organizador.
//
// O tipo da foto é conferido pelos primeiros bytes do arquivo (a "assinatura" do formato), não pela
// extensão nem pelo Content-Type que o navegador mandou: os dois o usuário escolhe à vontade.
//   JPG   FF D8 FF
//   PNG   89 50 4E 47 0D 0A 1A 0A
//   WebP  "RIFF" + 4 bytes de tamanho + "WEBP"
//
// O nome do objeto é gerado aqui (proposals/<proposal_key>/<photo_key>.<ext>), nunca o nome do
// arquivo enviado. O photo_key é o UUID desse nome: a tabela não tem coluna própria para ele.

import { randomUUID } from 'node:crypto'

import { StorageConnector } from '../connectors/storage/index.js'

export const MAX_PHOTOS_PER_PROPOSAL = 5
export const MAX_PHOTO_MEGABYTES = 5
export const MAX_PHOTO_BYTES = MAX_PHOTO_MEGABYTES * 1024 * 1024

const IMAGE_TYPES = [
  { extension: 'jpg', contentType: 'image/jpeg', matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  {
    extension: 'png',
    contentType: 'image/png',
    matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    extension: 'webp',
    contentType: 'image/webp',
    matches: (bytes) => bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP',
  },
]

function startsWith(bytes, signature) {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

// { extension, contentType } do formato real do arquivo, ou null se não for JPG, PNG nem WebP
export function detectImageType(buffer) {
  const type = IMAGE_TYPES.find((candidate) => candidate.matches(buffer))
  return type ? { extension: type.extension, contentType: type.contentType } : null
}

export function buildPhotoPath(proposalKey, extension) {
  const photoKey = randomUUID()
  return { photoKey, path: `proposals/${proposalKey}/${photoKey}.${extension}` }
}

// o caminho de cada formato aceito, para achar a foto pelo photo_key sem saber a extensão
export function possiblePhotoPaths(proposalKey, photoKey) {
  return IMAGE_TYPES.map(({ extension }) => `proposals/${proposalKey}/${photoKey}.${extension}`)
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export const isPhotoKey = (value) => UUID_PATTERN.test(value)

// "proposals/<proposal_key>/<photo_key>.webp" → "<photo_key>"
export function photoKeyFromPath(path) {
  return path
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '')
}

// a primeira posição livre de 1 a 5 (proposal_photo tem UNIQUE(proposal_id, position))
export function firstFreePosition(photos) {
  const taken = new Set(photos.map((photo) => Number(photo.position)))
  for (let position = 1; position <= MAX_PHOTOS_PER_PROPOSAL; position++) {
    if (!taken.has(position)) return position
  }
  return null
}

// fotos do banco → resposta da API, com a URL de leitura assinada (vale por pouco tempo)
export async function toPhotoResponses(photos) {
  return Promise.all(
    photos.map(async (photo) => ({ photo_key: photoKeyFromPath(photo.url), url: await StorageConnector.getUrl(photo.url) })),
  )
}
