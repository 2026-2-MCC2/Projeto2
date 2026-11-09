export class Context {
  constructor(globalTraceId, cloudTraceId) {
    this.globalTraceId = globalTraceId
    this.cloudTraceId = cloudTraceId
    this.dbSession = null
    this.user = null
    this.requestStartTime = null

    this.media = null
    this.responseMedia = undefined
    this.isRequestFinished = false
  }

  addSession(dbSession) {
    this.dbSession = dbSession
  }
}
