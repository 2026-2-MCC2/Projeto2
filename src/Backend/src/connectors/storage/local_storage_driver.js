import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

import { assertValidObjectPath, contentTypeOf } from './object_path.js'

export class LocalStorageDriver {
  constructor({ directory, publicUrl, expirationSeconds, getSigningKey }) {
    this.directory = resolve(directory)
    this.publicUrl = publicUrl.replace(/\/+$/, '')
    this.expirationSeconds = expirationSeconds
    this.getSigningKey = getSigningKey
  }

  // o tipo não é guardado: na leitura ele sai da extensão do caminho (object_path.js)
  async save(buffer, contentType, path) {
    assertValidObjectPath(path)
    const filePath = this.#filePath(path)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, buffer)
    return path
  }

  // apagar o que não existe não é erro (mesmo comportamento do driver gcs)
  async remove(path) {
    assertValidObjectPath(path)
    await rm(this.#filePath(path), { force: true })
  }

  async getUrl(path) {
    assertValidObjectPath(path)
    const expires = Math.floor(Date.now() / 1000) + this.expirationSeconds
    const signature = await this.#sign(path, expires)
    return `${this.publicUrl}/${path}?expires=${expires}&signature=${signature}`
  }

  // null em qualquer falha: a rota responde 404 sem revelar se o arquivo existe
  async read(path, { expires, signature }) {
    try {
      assertValidObjectPath(path)
    } catch {
      return null
    }

    const expiresAt = Number(expires)
    if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null
    if (!(await this.#hasValidSignature(path, expiresAt, signature))) return null

    try {
      return { buffer: await readFile(this.#filePath(path)), contentType: contentTypeOf(path) }
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }

  async #sign(path, expires) {
    const key = await this.getSigningKey()
    return createHmac('sha256', key).update(`${path}:${expires}`).digest('base64url')
  }

  async #hasValidSignature(path, expires, signature) {
    if (typeof signature !== 'string') return false
    const expected = Buffer.from(await this.#sign(path, expires))
    const received = Buffer.from(signature)
    // comparação em tempo constante, para a assinatura não poder ser adivinhada pelo tempo de resposta
    return expected.length === received.length && timingSafeEqual(expected, received)
  }

  // o caminho já foi validado; a conferência abaixo é uma segunda barreira contra sair da pasta
  #filePath(path) {
    const filePath = resolve(this.directory, path)
    if (!filePath.startsWith(this.directory + sep)) {
      throw new Error(`Storage object path escapes the storage directory: ${path}`)
    }
    return filePath
  }
}
