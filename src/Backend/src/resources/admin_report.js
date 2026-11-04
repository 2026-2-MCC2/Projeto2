import { USER_PROFILES } from '../constants.js'
import { AdminReportController } from '../controllers/admin_report_controller.js'
import { SecurityTools } from '../utils/security_tools.js'
import { parseAdminReportParams } from '../utils/admin_report_params.js'

export class AdminReportResource {
  async onGet(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])

    const params = parseAdminReportParams(req)
    const controller = new AdminReportController(req.context)
    const reportDto = await controller.getReport(params)

    res.status(200).json(reportDto)
  }
}
