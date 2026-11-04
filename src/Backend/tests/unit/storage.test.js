// Testes unitários do armazenamento de arquivos (connectors/storage/).
// Nenhum teste fala com o Google: o driver gcs recebe um cliente simulado com a mesma forma do
// @google-cloud/storage, e o driver local usa uma pasta temporária apagada no fim.

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, afterEach, before, describe, test } from 'node:test'

import { GcsStorageDriver } from '../../src/connectors/storage/gcs_storage_driver.js'
import { createStorageDriver, StorageConnector, STORAGE_DRIVERS } from '../../src/connectors/storage/index.js'
import { LocalStorageDriver } from '../../src/connectors/storage/local_storage_driver.js'
import { assertValidObjectPath, contentTypeOf, MAX_OBJECT_PATH_LENGTH } from '../../src/connectors/storage/object_path.js'
import { LocalFileResource } from '../../src/resources/local_file.js'

const PHOTO_PATH = 'proposals/6f1c2a9e-1111-4111-8111-111111111111/1-ab12cd.jpg'
const PHOTO = Buffer.from('conteúdo de uma foto de teste')
const SIGNING_KEY = 'chave-de-teste'
// 04/11/2026 12:00:00 UTC, em milissegundos
const NOW = Date.UTC(2026, 10, 4, 12, 0, 0)

describe('assertValidObjectPath', () => {
  test('aceita caminhos com pastas e extensão', () => {
    for (const path of [PHOTO_PATH, 'foto.png', 'a/b_c-d/e.webp']) {
      assert.doesNotThrow(() => assertValidObjectPath(path), path)
    }
  })

  test('recusa caminhos que saem da pasta, absolutos, vazios ou sem extensão', () => {
    const invalid = [
      '../segredo.jpg',
      'proposals/../../segredo.jpg',
      '/etc/passwd.jpg',
      'proposals//1.jpg',
      'proposals\\1.jpg',
      'proposals/1',
      'proposals/1.jpg/',
      '',
      null,
      `${'a'.repeat(MAX_OBJECT_PATH_LENGTH)}.jpg`,
    ]
    for (const path of invalid) {
      assert.throws(() => assertValidObjectPath(path), /Invalid storage object path/, String(path))
    }
  })

  test('o tipo do arquivo sai da extensão', () => {
    assert.equal(contentTypeOf('a/b.JPG'), 'image/jpeg')
    assert.equal(contentTypeOf('a/b.png'), 'image/png')
    assert.equal(contentTypeOf('a/b.webp'), 'image/webp')
    assert.equal(contentTypeOf('a/b.pdf'), 'application/octet-stream')
  })
})

describe('LocalStorageDriver', () => {
  let directory
  let now

  before(async () => {
    directory = await mkdtemp(join(tmpdir(), 'trocaticket-storage-test-'))
  })

  after(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  function createDriver() {
    now = NOW
    return new LocalStorageDriver({
      directory,
      publicUrl: 'http://localhost:3300/event_planning/files/',
      expirationSeconds: 900,
      getSigningKey: async () => SIGNING_KEY,
      now: () => now,
    })
  }

  // separa caminho e parâmetros da URL devolvida pelo getUrl
  function parse(url) {
    const parsed = new URL(url)
    const path = parsed.pathname.replace('/event_planning/files/', '')
    return { path, expires: parsed.searchParams.get('expires'), signature: parsed.searchParams.get('signature') }
  }

  test('save grava na pasta e devolve o caminho do objeto (o que vai para o banco)', async () => {
    const driver = createDriver()

    const path = await driver.save(PHOTO, 'image/jpeg', PHOTO_PATH)

    assert.equal(path, PHOTO_PATH)
    assert.deepEqual(await readFile(join(directory, ...PHOTO_PATH.split('/'))), PHOTO)
  })

  test('getUrl devolve uma URL da API com expiração de 15 minutos e assinatura', async () => {
    const driver = createDriver()

    const url = await driver.getUrl(PHOTO_PATH)
    const { path, expires, signature } = parse(url)

    assert.match(url, /^http:\/\/localhost:3300\/event_planning\/files\/proposals\//)
    assert.equal(path, PHOTO_PATH)
    assert.equal(Number(expires), NOW / 1000 + 900)
    assert.match(signature, /^[A-Za-z0-9_-]{43}$/)
  })

  test('read devolve o arquivo com a URL certa, dentro da validade', async () => {
    const driver = createDriver()
    await driver.save(PHOTO, 'image/jpeg', PHOTO_PATH)
    const { path, expires, signature } = parse(await driver.getUrl(PHOTO_PATH))

    now = NOW + 899 * 1000
    const file = await driver.read(path, { expires, signature })

    assert.deepEqual(file.buffer, PHOTO)
    assert.equal(file.contentType, 'image/jpeg')
  })

  test('read recusa URL vencida, assinatura alterada ou de outro arquivo', async () => {
    const driver = createDriver()
    await driver.save(PHOTO, 'image/jpeg', PHOTO_PATH)
    await driver.save(PHOTO, 'image/png', 'proposals/outra/2-ef34.png')
    const { expires, signature } = parse(await driver.getUrl(PHOTO_PATH))

    // troca o último caractere por outro, sempre diferente do original
    const tampered = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`
    assert.equal(await driver.read(PHOTO_PATH, { expires, signature: tampered }), null)
    assert.equal(await driver.read(PHOTO_PATH, { expires: String(Number(expires) + 60), signature }), null)
    assert.equal(await driver.read('proposals/outra/2-ef34.png', { expires, signature }), null)
    assert.equal(await driver.read(PHOTO_PATH, { expires, signature: undefined }), null)
    assert.equal(await driver.read('../fora.jpg', { expires, signature }), null)

    now = NOW + 901 * 1000
    assert.equal(await driver.read(PHOTO_PATH, { expires, signature }), null)
  })

  test('read de arquivo que não existe devolve null', async () => {
    const driver = createDriver()
    const missing = 'proposals/nao-existe/1-aa.jpg'
    const { expires, signature } = parse(await driver.getUrl(missing))

    assert.equal(await driver.read(missing, { expires, signature }), null)
  })

  test('remove apaga o arquivo, e apagar de novo não é erro', async () => {
    const driver = createDriver()
    await driver.save(PHOTO, 'image/jpeg', PHOTO_PATH)

    await driver.remove(PHOTO_PATH)
    await driver.remove(PHOTO_PATH)

    assert.equal(existsSync(join(directory, ...PHOTO_PATH.split('/'))), false)
  })

  test('caminho inválido é recusado antes de mexer no disco', async () => {
    const driver = createDriver()

    await assert.rejects(() => driver.save(PHOTO, 'image/jpeg', '../fora.jpg'), /Invalid storage object path/)
    await assert.rejects(() => driver.remove('/etc/passwd.jpg'), /Invalid storage object path/)
    await assert.rejects(() => driver.getUrl('sem-extensao'), /Invalid storage object path/)
    assert.equal(existsSync(join(directory, '..', 'fora.jpg')), false)
  })
})

describe('GcsStorageDriver (cliente do GCS simulado)', () => {
  // mesma forma do @google-cloud/storage: client.bucket(nome).file(caminho).save/delete/getSignedUrl
  function createClient() {
    const calls = []
    const client = {
      bucket(bucketName) {
        calls.push(['bucket', bucketName])
        return {
          file(path) {
            return {
              async save(buffer, options) {
                calls.push(['save', path, buffer, options])
              },
              async delete(options) {
                calls.push(['delete', path, options])
              },
              async getSignedUrl(options) {
                calls.push(['getSignedUrl', path, options])
                return [`https://storage.googleapis.com/fotos-teste/${path}?X-Goog-Signature=abc`]
              },
            }
          },
        }
      },
    }
    return { client, calls }
  }

  function createDriver() {
    const { client, calls } = createClient()
    const driver = new GcsStorageDriver({ client, bucketName: 'fotos-teste', expirationSeconds: 900, now: () => NOW })
    return { driver, calls }
  }

  test('save envia o arquivo com o tipo, sem upload resumable, e devolve o caminho', async () => {
    const { driver, calls } = createDriver()

    const path = await driver.save(PHOTO, 'image/jpeg', PHOTO_PATH)

    assert.equal(path, PHOTO_PATH)
    assert.deepEqual(calls, [
      ['bucket', 'fotos-teste'],
      ['save', PHOTO_PATH, PHOTO, { contentType: 'image/jpeg', resumable: false }],
    ])
  })

  test('getUrl pede URL assinada v4 de leitura, com validade de 15 minutos', async () => {
    const { driver, calls } = createDriver()

    const url = await driver.getUrl(PHOTO_PATH)

    assert.equal(url, `https://storage.googleapis.com/fotos-teste/${PHOTO_PATH}?X-Goog-Signature=abc`)
    assert.deepEqual(calls[1], ['getSignedUrl', PHOTO_PATH, { version: 'v4', action: 'read', expires: NOW + 900 * 1000 }])
  })

  test('remove apaga ignorando objeto que não existe', async () => {
    const { driver, calls } = createDriver()

    await driver.remove(PHOTO_PATH)

    assert.deepEqual(calls[1], ['delete', PHOTO_PATH, { ignoreNotFound: true }])
  })

  test('caminho inválido é recusado sem chamar o GCS', async () => {
    const { driver, calls } = createDriver()

    await assert.rejects(() => driver.save(PHOTO, 'image/jpeg', '../fora.jpg'), /Invalid storage object path/)
    await assert.rejects(() => driver.getUrl('/x.jpg'), /Invalid storage object path/)
    assert.deepEqual(calls, [['bucket', 'fotos-teste']])
  })
})

describe('createStorageDriver', () => {
  const localSettings = {
    localDirectory: join(tmpdir(), 'trocaticket-storage-config'),
    localPublicUrl: 'http://localhost:3300/event_planning/files',
    expirationSeconds: 900,
    getSigningKey: async () => SIGNING_KEY,
  }

  test('escolhe o driver pela configuração', () => {
    const { client } = { client: { bucket: () => ({}) } }

    assert.ok(createStorageDriver({ driver: STORAGE_DRIVERS.LOCAL, ...localSettings }) instanceof LocalStorageDriver)
    assert.ok(
      createStorageDriver({ driver: STORAGE_DRIVERS.GCS, gcsBucket: 'fotos', expirationSeconds: 900, gcsClient: client }) instanceof
        GcsStorageDriver,
    )
  })

  test('avisa quais variáveis faltam e recusa driver desconhecido', () => {
    assert.throws(() => createStorageDriver({ driver: 'local', expirationSeconds: 900 }), /STORAGE_LOCAL_DIR, STORAGE_LOCAL_PUBLIC_URL/)
    assert.throws(() => createStorageDriver({ driver: 'gcs', expirationSeconds: 900, gcsClient: {} }), /GCS_BUCKET/)
    assert.throws(() => createStorageDriver({ driver: '', expirationSeconds: 900 }), /STORAGE_DRIVER must be "local" or "gcs"/)
    assert.throws(() => createStorageDriver({ driver: 's3', expirationSeconds: 900 }), /STORAGE_DRIVER must be/)
  })
})

describe('LocalFileResource', () => {
  const originalReadLocalFile = StorageConnector.readLocalFile

  afterEach(() => {
    StorageConnector.readLocalFile = originalReadLocalFile
  })

  function createResponse() {
    return {
      statusCode: null,
      headers: {},
      body: null,
      ended: false,
      status(code) {
        this.statusCode = code
        return this
      },
      set(headers) {
        Object.assign(this.headers, headers)
        return this
      },
      send(body) {
        this.body = body
        return this
      },
      end() {
        this.ended = true
        return this
      },
    }
  }

  test('serve o arquivo com o Content-Type e sem cache público', async () => {
    let received
    StorageConnector.readLocalFile = async (path, query) => {
      received = { path, query }
      return { buffer: PHOTO, contentType: 'image/jpeg' }
    }
    const response = createResponse()

    // no Express 5 o curinga *path chega como lista dos pedaços
    await new LocalFileResource().onGet({ params: { path: PHOTO_PATH.split('/') }, query: { expires: '123', signature: 'abc' } }, response)

    assert.deepEqual(received, { path: PHOTO_PATH, query: { expires: '123', signature: 'abc' } })
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, PHOTO)
    assert.equal(response.headers['Content-Type'], 'image/jpeg')
    assert.equal(response.headers['Cache-Control'], 'private, max-age=0')
    assert.equal(response.headers['X-Content-Type-Options'], 'nosniff')
  })

  test('URL inválida, vencida ou arquivo inexistente responde 404 sem corpo', async () => {
    StorageConnector.readLocalFile = async () => null
    const response = createResponse()

    await new LocalFileResource().onGet({ params: { path: ['x.jpg'] }, query: {} }, response)

    assert.equal(response.statusCode, 404)
    assert.equal(response.ended, true)
    assert.equal(response.body, null)
  })
})
