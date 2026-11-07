import { InvalidParameter } from '../errors/index.js'

// cursor opaco de paginação: valores da última linha mostrada em JSON base64url; o front só repassa
export function encodeCursor(values) {
  return Buffer.from(JSON.stringify(values)).toString('base64url')
}

// parse recebe os valores decodificados e lança se forem inválidos
export function decodeCursor(after, parse) {
  try {
    return parse(JSON.parse(Buffer.from(after, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidParameter('The "after" parameter is invalid. Use the next_cursor of the previous page.')
  }
}
