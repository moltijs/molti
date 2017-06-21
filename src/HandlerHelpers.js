const Controller = require('./Handler');

module.exports = {
  IDPathParam: Controller.Param('id').number().path(),
  qQueryParam: Controller.Param('q').string().query()
};