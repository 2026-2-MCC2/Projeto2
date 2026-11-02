// Testes unitários do resource responsável pela rota administrativa de status.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { create } from '../../src/app.js'
import { ForbiddenProfile, InvalidSchema } from '../../src/errors/index.js'
import { AdminUserController } from '../../src/controllers/admin_user_controller.js'
import { AdminUserResource } from '../../src/resources/admin_user.js'

const originalDecideStatus = AdminUserController.prototype.decideStatus

afterEach(() => {
  AdminUserController.prototype.decideStatus = originalDecideStatus
})

function createRequest(profile, media) {
  return {
    context: {
      user: { userKey: 'authenticated-user-key', profile },
      media,
    },
  }
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

describe('AdminUserResource', () => {
  test('app registra o PUT no endpoint administrativo recomendado', () => {
    const app = create()
    const route = app.router.stack
      .map((layer) => layer.route)
      .find((route) => route?.path === '/event_planning/admin/users/:user_key/status')

    assert.ok(route)
    assert.equal(route.methods.put, true)
  })

  test('admin envia a decisão ao controller e recebe HTTP 202 com o DTO', async () => {
    const request = createRequest('admin', { status: 'approved' })
    const response = createResponse()
    let controllerArguments

    AdminUserController.prototype.decideStatus = async function (userKey, status) {
      controllerArguments = [this.context.user.userKey, userKey, status]
      return { user_key: userKey, status }
    }

    const resource = new AdminUserResource()
    await resource.onPutByKey(request, response, 'target-user-key')

    assert.deepEqual(controllerArguments, ['authenticated-user-key', 'target-user-key', 'approved'])
    assert.equal(response.statusCode, 202)
    assert.deepEqual(response.body, { user_key: 'target-user-key', status: 'approved' })
  })

  test('perfil não admin é barrado antes da validação do body', async () => {
    const request = createRequest('organizador', { status: 'invalid' })
    const response = createResponse()
    let controllerCalled = false
    AdminUserController.prototype.decideStatus = async () => {
      controllerCalled = true
    }

    const resource = new AdminUserResource()
    await assert.rejects(() => resource.onPutByKey(request, response, 'target-user-key'), ForbiddenProfile)

    assert.equal(controllerCalled, false)
    assert.equal(response.statusCode, null)
  })

  test('body inválido de admin é rejeitado antes do controller', async () => {
    const request = createRequest('admin', { status: 'pending' })
    const response = createResponse()
    let controllerCalled = false
    AdminUserController.prototype.decideStatus = async () => {
      controllerCalled = true
    }

    const resource = new AdminUserResource()
    await assert.rejects(() => resource.onPutByKey(request, response, 'target-user-key'), InvalidSchema)

    assert.equal(controllerCalled, false)
    assert.equal(response.statusCode, null)
  })
})
