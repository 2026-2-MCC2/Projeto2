import { AuthController } from '../controllers/auth_controller.js'

export class MeResource {
  async onGet(req, res) {
    const controller = new AuthController(req.context)
    const userDto = await controller.getCurrentUser(req.context.user.userKey)

    res.status(200).json(userDto)
  }
}
