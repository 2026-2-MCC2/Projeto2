// Testes unitários das fotos das propostas: tipo real do arquivo, nome gerado e o tratamento de falha
// entre o armazenamento e o banco (sem arquivo órfão nem registro sem arquivo).

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { StorageConnector } from '../../src/connectors/storage/index.js'
import { SupplierProposalController } from '../../src/controllers/supplier_proposal_controller.js'
import { InvalidProposalPhoto, NotFoundProposalPhoto, ProposalPhotoLimitReached } from '../../src/errors/index.js'
import { ProposalRepository } from '../../src/repositories/proposal_repository.js'
import { SupplierEventRepository } from '../../src/repositories/supplier_event_repository.js'
import { UserRepository } from '../../src/repositories/user_repository.js'
import {
  buildPhotoPath,
  detectImageType,
  firstFreePosition,
  isPhotoKey,
  photoKeyFromPath,
  possiblePhotoPaths,
} from '../../src/utils/proposal_photo_tools.js'
import { ImageFixtures } from '../utils/image_fixtures.js'

const PROPOSAL_KEY = '33333333-3333-4333-8333-333333333333'

const { JPG, PNG, WEBP } = ImageFixtures

describe('detectImageType', () => {
  test('reconhece JPG, PNG e WebP pelos bytes', () => {
    assert.deepEqual(detectImageType(JPG), { extension: 'jpg', contentType: 'image/jpeg' })
    assert.deepEqual(detectImageType(PNG), { extension: 'png', contentType: 'image/png' })
    assert.deepEqual(detectImageType(WEBP), { extension: 'webp', contentType: 'image/webp' })
  })

  test('recusa texto, GIF, PDF e arquivos curtos, mesmo com nome de imagem', () => {
    assert.equal(detectImageType(Buffer.from('não sou uma foto')), null)
    assert.equal(detectImageType(Buffer.from('GIF89a...')), null)
    assert.equal(detectImageType(Buffer.from('%PDF-1.7')), null)
    assert.equal(detectImageType(Buffer.from([0xff, 0xd8])), null)
    assert.equal(detectImageType(Buffer.from('RIFF....WAVE')), null)
  })
})

describe('nomes e posições das fotos', () => {
  test('o nome é gerado pelo sistema e o photo_key é o UUID dele', () => {
    const { photoKey, path } = buildPhotoPath(PROPOSAL_KEY, 'webp')

    assert.ok(isPhotoKey(photoKey))
    assert.equal(path, `proposals/${PROPOSAL_KEY}/${photoKey}.webp`)
    assert.equal(photoKeyFromPath(path), photoKey)
    assert.ok(possiblePhotoPaths(PROPOSAL_KEY, photoKey).includes(path))
  })

  test('isPhotoKey só aceita UUID (nada de caminho ou curinga)', () => {
    assert.equal(isPhotoKey('../x'), false)
    assert.equal(isPhotoKey('%'), false)
    assert.equal(isPhotoKey('44444444-4444-4444-8444-44444444444'), false)
  })

  test('firstFreePosition reaproveita o buraco e para em 5', () => {
    assert.equal(firstFreePosition([]), 1)
    assert.equal(firstFreePosition([{ position: 1 }, { position: 3 }]), 2)
    assert.equal(firstFreePosition([1, 2, 3, 4, 5].map((position) => ({ position }))), null)
  })
})

describe('SupplierProposalController: fotos', () => {
  const originals = {
    getProfileByKey: UserRepository.prototype.getProfileByKey,
    getSupplierProposalByKey: ProposalRepository.prototype.getSupplierProposalByKey,
    getSupplierProposalForUpdate: ProposalRepository.prototype.getSupplierProposalForUpdate,
    getEventForShare: SupplierEventRepository.prototype.getEventForShare,
    getPhotos: ProposalRepository.prototype.getPhotos,
    createPhoto: ProposalRepository.prototype.createPhoto,
    getPhotoByPaths: ProposalRepository.prototype.getPhotoByPaths,
    deletePhoto: ProposalRepository.prototype.deletePhoto,
    save: StorageConnector.save,
    remove: StorageConnector.remove,
    getUrl: StorageConnector.getUrl,
  }

  afterEach(() => {
    UserRepository.prototype.getProfileByKey = originals.getProfileByKey
    ProposalRepository.prototype.getSupplierProposalByKey = originals.getSupplierProposalByKey
    ProposalRepository.prototype.getSupplierProposalForUpdate = originals.getSupplierProposalForUpdate
    SupplierEventRepository.prototype.getEventForShare = originals.getEventForShare
    ProposalRepository.prototype.getPhotos = originals.getPhotos
    ProposalRepository.prototype.createPhoto = originals.createPhoto
    ProposalRepository.prototype.getPhotoByPaths = originals.getPhotoByPaths
    ProposalRepository.prototype.deletePhoto = originals.deletePhoto
    StorageConnector.save = originals.save
    StorageConnector.remove = originals.remove
    StorageConnector.getUrl = originals.getUrl
  })

  // proposta enviada, de evento em cotação, com as fotos dadas; registra a ordem das operações
  function mockProposal({ photos = [] } = {}) {
    const operations = []
    UserRepository.prototype.getProfileByKey = async () => ({ id: 1, supplier: { id: 8 } })
    ProposalRepository.prototype.getSupplierProposalByKey = async () => ({ id: 99, event_id: 20, status: 'sent' })
    SupplierEventRepository.prototype.getEventForShare = async () => ({ id: 20, status: 'open_for_quotes' })
    ProposalRepository.prototype.getSupplierProposalForUpdate = async () => ({ id: 99, status: 'sent' })
    ProposalRepository.prototype.getPhotos = async () => photos
    ProposalRepository.prototype.createPhoto = async (proposalId, position, path) => operations.push(['createPhoto', position, path])
    StorageConnector.save = async (buffer, contentType, path) => {
      operations.push(['save', contentType, path])
      return path
    }
    StorageConnector.remove = async (path) => operations.push(['remove', path])
    StorageConnector.getUrl = async (path) => `https://armazenamento.test/${path}`

    const context = { dbSession: { commit: async () => operations.push(['commit']) } }
    return { controller: new SupplierProposalController(context), operations }
  }

  test('grava o arquivo, depois o registro, e confirma; o nome vem do sistema', async () => {
    const { controller, operations } = mockProposal({ photos: [{ position: 1 }] })

    const result = await controller.addPhoto('supplier-key', PROPOSAL_KEY, { buffer: PNG, originalname: '../../segredo.png' })

    const [save, createPhoto, commit] = operations
    assert.match(save[2], new RegExp(`^proposals/${PROPOSAL_KEY}/[0-9a-f-]{36}\\.png$`))
    assert.deepEqual(save.slice(0, 2), ['save', 'image/png'])
    assert.deepEqual(createPhoto, ['createPhoto', 2, save[2]])
    assert.deepEqual(commit, ['commit'])
    assert.deepEqual(result, { photo_key: photoKeyFromPath(save[2]), url: `https://armazenamento.test/${save[2]}` })
  })

  test('arquivo que não é imagem é recusado antes de travar ou gravar qualquer coisa', async () => {
    const { controller, operations } = mockProposal()
    let locked = false
    ProposalRepository.prototype.getSupplierProposalForUpdate = async () => {
      locked = true
    }

    await assert.rejects(
      () => controller.addPhoto('supplier-key', PROPOSAL_KEY, { buffer: Buffer.from('texto'), originalname: 'foto.jpg' }),
      InvalidProposalPhoto,
    )
    assert.equal(locked, false)
    assert.deepEqual(operations, [])
  })

  test('com 5 fotos recusa sem gravar arquivo', async () => {
    const { controller, operations } = mockProposal({ photos: [1, 2, 3, 4, 5].map((position) => ({ position })) })

    await assert.rejects(() => controller.addPhoto('supplier-key', PROPOSAL_KEY, { buffer: JPG }), ProposalPhotoLimitReached)
    assert.deepEqual(operations, [])
  })

  test('se o armazenamento falhar, nada é gravado no banco', async () => {
    const { controller, operations } = mockProposal()
    StorageConnector.save = async () => {
      throw new Error('storage unavailable')
    }

    await assert.rejects(() => controller.addPhoto('supplier-key', PROPOSAL_KEY, { buffer: JPG }), /storage unavailable/)
    assert.deepEqual(operations, [])
  })

  test('se o banco falhar depois do upload, o arquivo recém-gravado é apagado (sem órfão)', async () => {
    const { controller, operations } = mockProposal()
    ProposalRepository.prototype.createPhoto = async () => {
      throw new Error('database write failed')
    }

    await assert.rejects(() => controller.addPhoto('supplier-key', PROPOSAL_KEY, { buffer: JPG }), /database write failed/)
    const savedPath = operations[0][2]
    assert.deepEqual(operations, [
      ['save', 'image/jpeg', savedPath],
      ['remove', savedPath],
    ])
  })

  test('se o commit falhar, o arquivo também é apagado', async () => {
    const { controller, operations } = mockProposal()
    controller.session.commit = async () => {
      throw new Error('commit failed')
    }

    await assert.rejects(() => controller.addPhoto('supplier-key', PROPOSAL_KEY, { buffer: WEBP }), /commit failed/)
    assert.equal(operations.at(-1)[0], 'remove')
  })

  test('apagar foto tira o registro, confirma e só depois apaga o arquivo', async () => {
    const { controller, operations } = mockProposal()
    const path = `proposals/${PROPOSAL_KEY}/44444444-4444-4444-8444-444444444444.jpg`
    ProposalRepository.prototype.getPhotoByPaths = async (proposalId, paths) => (paths.includes(path) ? { id: 5, url: path } : null)
    ProposalRepository.prototype.deletePhoto = async () => operations.push(['deletePhoto'])

    await controller.deletePhoto('supplier-key', PROPOSAL_KEY, '44444444-4444-4444-8444-444444444444')

    assert.deepEqual(operations, [['deletePhoto'], ['commit'], ['remove', path]])
  })

  test('falha ao apagar o arquivo depois do commit não vira erro (fica no log)', async () => {
    const { controller, operations } = mockProposal()
    ProposalRepository.prototype.getPhotoByPaths = async () => ({ id: 5, url: `proposals/${PROPOSAL_KEY}/a.jpg` })
    ProposalRepository.prototype.deletePhoto = async () => operations.push(['deletePhoto'])
    StorageConnector.remove = async () => {
      throw new Error('storage unavailable')
    }
    const logged = []
    controller.logger.error = (message) => logged.push(message)

    await controller.deletePhoto('supplier-key', PROPOSAL_KEY, '44444444-4444-4444-8444-444444444444')

    assert.deepEqual(operations, [['deletePhoto'], ['commit']])
    assert.match(logged[0], /Could not remove stored file proposals\//)
  })

  test('photo_key que não é UUID responde 404 sem consultar o banco', async () => {
    const { controller } = mockProposal()
    let consulted = false
    ProposalRepository.prototype.getPhotoByPaths = async () => {
      consulted = true
    }

    await assert.rejects(() => controller.deletePhoto('supplier-key', PROPOSAL_KEY, '%'), NotFoundProposalPhoto)
    assert.equal(consulted, false)
  })
})
