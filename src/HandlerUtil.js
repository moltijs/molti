class HandlerUtil {
  constructor(req) {
    this.log = req.log;
    this.customerId = parseInt(req.customerId);
    this.user = req.user;
    this.clientSettings = req.clientSettings;
  }
}

module.exports = HandlerUtil;