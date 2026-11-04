import { AdminReportDTO } from '../dtos/admin_report_dto.js'
import { AdminReportRepository } from '../repositories/admin_report_repository.js'
import { BaseController } from './base_controller.js'

export class AdminReportController extends BaseController {
  constructor(context) {
    super(context, 'AdminReportController')
    this.adminReportRepository = new AdminReportRepository(context)
  }

  async getReport(params) {
    const report = await this.adminReportRepository.getReportPage(params)
    return AdminReportDTO.response(report, params)
  }
}
