const Knex = require('knex');

class Registry {
  constructor(dbConfig) {
    this.id = dbConfig.id || 'default';
    this._knex = Knex(Object.assign({}, dbConfig));
    this._models = dbConfig.models;
    dbConfig.models.forEach((model) => {
      this[model.modelName] = model;
      model.__defineGetter__('knex', () => this._knex);
      model.__defineGetter__('registry', () => this);
    });
  }
}

module.exports = Registry;
