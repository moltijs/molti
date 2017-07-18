const Application = require('../../src/Application');
const Controller = require('../../src/Controller');
const Handler = require('../../src/Handler');
const Generics = require('../../src/Generics');
const registry = require('./Models');
const controller = new Controller({
  basePath: '/hospital/'
});

controller.get(new Handler({
  params: [Generics.params.idParam],
  responses: [Generics.responses.foundModelList('Patient')],
  path: '/:id/getPatients',
  async handler({ id }, { foundList }, { models }) {
    let hospital = await models.Hospital.findById(1, {
      withRelated: ['doctors.patients']
    });

    return foundList({ records: hospital.getPatients() });
  }
}));

let app = new Application({
  utils: [function(){this.models = registry;}],
  controllers: [controller],
  models: registry._models
});

module.exports = app;