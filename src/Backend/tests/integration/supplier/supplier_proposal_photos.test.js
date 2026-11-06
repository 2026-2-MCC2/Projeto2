import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ImageFixtures } from '../../utils/image_fixtures.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { ClientRequisition } from '../../utils/requisition.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

// o fornecedor do DbUtils.createUserFixture atende Estrutura e Segurança
async function createUser(profile, name = 'RF10 Fotos') {
  const user = await ObjectGenerator.createUserFixture({ profile, status: 'approved', name })
  fixtureUserKeys.push(user.userKey)
  return { user, headers: TokenGenerator.authorizationHeader(profile, { userKey: user.userKey }) }
}

// evento em cotação com um item de Estrutura e uma proposta enviada pelo fornecedor
async function createScenario() {
  const organizer = await createUser('organizador')
  const supplier = await createUser('fornecedor', 'Palcos RF10 Fotos')
  const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers)
  const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)
  return { organizer, supplier, event, items, proposal }
}

const photo = (buffer, filename, contentType) => ({ buffer, filename, contentType })
const PNG_PHOTO = photo(ImageFixtures.PNG, 'palco.png', 'image/png')

async function upload(scenario, file = PNG_PHOTO) {
  return RequestGenerator.POST_supplier_proposal_photo(scenario.proposal.proposal_key, file, scenario.supplier.headers)
}

// baixa a foto pela URL de leitura que a API devolveu (servida pela rota local)
async function download(url) {
  const response = await fetch(url)
  return { status: response.status, contentType: response.headers.get('content-type'), body: Buffer.from(await response.arrayBuffer()) }
}

describe('POST /supplier/proposals/:proposal_key/photos', () => {
  test('envia a foto e devolve photo_key e uma URL que abre o arquivo', async () => {
    const scenario = await createScenario()

    const [status, response] = await upload(scenario)

    assert.equal(status, 201)
    assert.deepEqual(Object.keys(response).sort(), ['photo_key', 'url'])
    assert.match(response.photo_key, /^[0-9a-f-]{36}$/)
    // o nome do objeto é gerado pelo sistema, não o "palco.png" enviado
    assert.match(response.url, new RegExp(`/files/proposals/${scenario.proposal.proposal_key}/${response.photo_key}\\.png\\?`))

    const file = await download(response.url)
    assert.equal(file.status, 200)
    assert.equal(file.contentType, 'image/png')
    assert.deepEqual(file.body, ImageFixtures.PNG)
  })

  test('aceita JPG e WebP e usa a extensão do tipo real, não a do nome', async () => {
    const scenario = await createScenario()

    const [jpgStatus, jpg] = await upload(scenario, photo(ImageFixtures.JPG, 'foto.png', 'image/png'))
    const [webpStatus, webp] = await upload(scenario, photo(ImageFixtures.WEBP, 'foto', 'application/octet-stream'))

    assert.equal(jpgStatus, 201)
    assert.match(jpg.url, /\.jpg\?/)
    assert.equal(webpStatus, 201)
    assert.match(webp.url, /\.webp\?/)
  })

  test('arquivo que não é imagem de verdade responde 400, mesmo com nome e tipo de imagem', async () => {
    const scenario = await createScenario()

    const [status, response] = await upload(scenario, photo(ImageFixtures.TEXT, 'foto.jpg', 'image/jpeg'))

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000044')
  })

  test('sem arquivo, ou em outro campo, responde 400', async () => {
    const scenario = await createScenario()
    const key = scenario.proposal.proposal_key

    const [noFileStatus, noFile] = await RequestGenerator.POST_supplier_proposal_photo(key, null, scenario.supplier.headers)
    const [otherFieldStatus, otherField] = await RequestGenerator.POST_supplier_proposal_photo(key, PNG_PHOTO, scenario.supplier.headers, {
      fieldName: 'imagem',
    })

    assert.equal(noFileStatus, 400)
    assert.equal(noFile.code, 'EVP000044')
    assert.equal(otherFieldStatus, 400)
    assert.equal(otherField.code, 'EVP000044')
  })

  test('formulário cortado no meio responde 400, não 500', async () => {
    const scenario = await createScenario()
    const boundary = 'limite-do-formulario'

    const response = await ClientRequisition.send('POST', `/event_planning/supplier/proposals/${scenario.proposal.proposal_key}/photos`, {
      data: `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="palco.png"\r\nContent-Type: image/png\r\n\r\nmeia-foto`,
      headers: { ...scenario.supplier.headers, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    })

    assert.equal(response.responseStatus, 400)
    assert.equal(response.responseJson.code, 'EVP000044')
  })

  test('foto acima de 5 MB responde 413; com exatamente 5 MB passa', async () => {
    const scenario = await createScenario()

    const [bigStatus, big] = await upload(scenario, photo(ImageFixtures.pngOfSize(5 * 1024 * 1024 + 1), 'grande.png', 'image/png'))
    const [limitStatus] = await upload(scenario, photo(ImageFixtures.pngOfSize(5 * 1024 * 1024), 'limite.png', 'image/png'))

    assert.equal(bigStatus, 413)
    assert.equal(big.code, 'EVP000045')
    assert.equal(limitStatus, 201)
  })

  test('fotos enviadas ao mesmo tempo ficam todas, cada uma numa posição', async () => {
    const scenario = await createScenario()

    const results = await Promise.all([upload(scenario), upload(scenario), upload(scenario)])

    assert.deepEqual(
      results.map(([status]) => status),
      [201, 201, 201],
    )
    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(scenario.proposal.proposal_key, scenario.supplier.headers)
    assert.equal(detail.photos.length, 3)
  })

  test('caminho com maiúscula ou barra no fim não prende conexão do banco', async () => {
    const scenario = await createScenario()
    const grafias = ['Photos', 'photos/', 'PHOTOS/', 'Photos/', 'photos/', 'Photos']

    // mais envios do que conexões no pool: se cada um deixasse uma transação aberta, os últimos travariam
    for (let rodada = 0; rodada < 3; rodada++) {
      for (const path of grafias) {
        const [status] = await RequestGenerator.POST_supplier_proposal_photo(
          scenario.proposal.proposal_key,
          PNG_PHOTO,
          scenario.supplier.headers,
          { path },
        )
        assert.ok([201, 409].includes(status), `${path}: ${status}`)
      }
    }
    const [status, detail] = await RequestGenerator.GET_supplier_proposal_by_key(scenario.proposal.proposal_key, scenario.supplier.headers)

    assert.equal(status, 200)
    assert.equal(detail.photos.length, 5)
  })

  test('até 5 fotos por proposta: a sexta responde 409', async () => {
    const scenario = await createScenario()
    for (let index = 0; index < 5; index++) {
      const [status] = await upload(scenario)
      assert.equal(status, 201)
    }

    const [status, response] = await upload(scenario)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000043')
  })

  test('proposta aceita ou evento encerrado não recebem foto (409)', async () => {
    const accepted = await createScenario()
    const [acceptStatus] = await RequestGenerator.POST_event_proposal_accept(
      accepted.event.event_key,
      accepted.proposal.proposal_key,
      accepted.organizer.headers,
    )
    assert.equal(acceptStatus, 200)

    const closed = await createScenario()
    const [closeStatus] = await RequestGenerator.PATCH_event_status(closed.event.event_key, { status: 'closed' }, closed.organizer.headers)
    assert.equal(closeStatus, 200)

    const [acceptedStatus, acceptedError] = await upload(accepted)
    const [closedStatus, closedError] = await upload(closed)

    assert.equal(acceptedStatus, 409)
    assert.equal(acceptedError.code, 'EVP000041')
    assert.equal(closedStatus, 409)
    assert.equal(closedError.code, 'EVP000042')
  })

  test('outro fornecedor recebe 404, organizador 403 e sem token 401', async () => {
    const scenario = await createScenario()
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')
    const key = scenario.proposal.proposal_key

    const [otherStatus, other] = await RequestGenerator.POST_supplier_proposal_photo(key, PNG_PHOTO, otherSupplier.headers)
    const [organizerStatus] = await RequestGenerator.POST_supplier_proposal_photo(key, PNG_PHOTO, scenario.organizer.headers)
    const [anonymousStatus] = await RequestGenerator.POST_supplier_proposal_photo(key, PNG_PHOTO)

    assert.equal(otherStatus, 404)
    assert.equal(other.code, 'EVP000033')
    assert.equal(organizerStatus, 403)
    assert.equal(anonymousStatus, 401)
  })
})

describe('DELETE /supplier/proposals/:proposal_key/photos/:photo_key', () => {
  test('apaga o registro e o arquivo', async () => {
    const scenario = await createScenario()
    const [, uploaded] = await upload(scenario)

    const [status] = await RequestGenerator.DELETE_supplier_proposal_photo(
      scenario.proposal.proposal_key,
      uploaded.photo_key,
      scenario.supplier.headers,
    )

    assert.equal(status, 204)
    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(scenario.proposal.proposal_key, scenario.supplier.headers)
    assert.deepEqual(detail.photos, [])
    // a URL ainda está dentro da validade, mas o arquivo não existe mais
    assert.equal((await download(uploaded.url)).status, 404)
  })

  test('foto que não existe, ou de outra proposta, responde 404', async () => {
    const scenario = await createScenario()
    const other = await createScenario()
    const [, otherPhoto] = await upload(other)
    const key = scenario.proposal.proposal_key

    const [missingStatus, missing] = await RequestGenerator.DELETE_supplier_proposal_photo(
      key,
      '44444444-4444-4444-8444-444444444444',
      scenario.supplier.headers,
    )
    const [notUuidStatus] = await RequestGenerator.DELETE_supplier_proposal_photo(key, 'nao-e-uuid', scenario.supplier.headers)
    const [otherStatus] = await RequestGenerator.DELETE_supplier_proposal_photo(key, otherPhoto.photo_key, scenario.supplier.headers)

    assert.equal(missingStatus, 404)
    assert.equal(missing.code, 'EVP000046')
    assert.equal(notUuidStatus, 404)
    assert.equal(otherStatus, 404)
    // a foto da outra proposta continua lá
    assert.equal((await download(otherPhoto.url)).status, 200)
  })

  test('proposta aceita não deixa apagar foto (409) e outro fornecedor recebe 404', async () => {
    const scenario = await createScenario()
    const [, uploaded] = await upload(scenario)
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')

    const [otherStatus] = await RequestGenerator.DELETE_supplier_proposal_photo(
      scenario.proposal.proposal_key,
      uploaded.photo_key,
      otherSupplier.headers,
    )
    await RequestGenerator.POST_event_proposal_accept(scenario.event.event_key, scenario.proposal.proposal_key, scenario.organizer.headers)
    const [acceptedStatus, accepted] = await RequestGenerator.DELETE_supplier_proposal_photo(
      scenario.proposal.proposal_key,
      uploaded.photo_key,
      scenario.supplier.headers,
    )

    assert.equal(otherStatus, 404)
    assert.equal(acceptedStatus, 409)
    assert.equal(accepted.code, 'EVP000041')
    assert.equal((await download(uploaded.url)).status, 200)
  })
})

describe('Fotos na retirada e na leitura das propostas', () => {
  test('retirar a proposta apaga os arquivos das fotos', async () => {
    const scenario = await createScenario()
    const [, first] = await upload(scenario)
    const [, second] = await upload(scenario, photo(ImageFixtures.JPG, 'b.jpg', 'image/jpeg'))

    const [status] = await RequestGenerator.DELETE_supplier_proposal(scenario.proposal.proposal_key, scenario.supplier.headers)

    assert.equal(status, 204)
    assert.equal((await download(first.url)).status, 404)
    assert.equal((await download(second.url)).status, 404)
  })

  test('o dono vê as fotos no detalhe e o organizador na comparação, com URLs que abrem', async () => {
    const scenario = await createScenario()
    const [, uploaded] = await upload(scenario)

    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(scenario.proposal.proposal_key, scenario.supplier.headers)
    const [, comparison] = await RequestGenerator.GET_event_proposals(scenario.event.event_key, scenario.organizer.headers)
    const proposalInComparison = comparison.items
      .flatMap((item) => item.proposals)
      .find((proposal) => proposal.proposal_key === scenario.proposal.proposal_key)

    assert.deepEqual(
      detail.photos.map((photo) => photo.photo_key),
      [uploaded.photo_key],
    )
    assert.deepEqual(
      proposalInComparison.photos.map((photo) => photo.photo_key),
      [uploaded.photo_key],
    )
    assert.equal((await download(detail.photos[0].url)).status, 200)
    assert.equal((await download(proposalInComparison.photos[0].url)).status, 200)
  })

  test('outro fornecedor e organizador de outro evento não chegam às fotos', async () => {
    const scenario = await createScenario()
    await upload(scenario)
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')
    const otherOrganizer = await createUser('organizador')

    const [detailStatus] = await RequestGenerator.GET_supplier_proposal_by_key(scenario.proposal.proposal_key, otherSupplier.headers)
    const [comparisonStatus] = await RequestGenerator.GET_event_proposals(scenario.event.event_key, otherOrganizer.headers)
    const [supplierComparisonStatus] = await RequestGenerator.GET_event_proposals(scenario.event.event_key, scenario.supplier.headers)

    assert.equal(detailStatus, 404)
    assert.equal(comparisonStatus, 404)
    assert.equal(supplierComparisonStatus, 403)
  })

  test('a URL de leitura não abre com a assinatura alterada', async () => {
    const scenario = await createScenario()
    const [, uploaded] = await upload(scenario)
    const tampered = uploaded.url.replace(/signature=([A-Za-z0-9_-])/, (match, first) => `signature=${first === 'A' ? 'B' : 'A'}`)

    assert.equal((await download(tampered)).status, 404)
  })
})
