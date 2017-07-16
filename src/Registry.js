const Knex = require('knex');

class Registry {
  constructor(dbConfig) {
    this.id = dbConfig.id || 'default';
    
    if (!dbConfig.models) throw new ReferenceError('Models must be defined for a registry');

    dbConfig.models.forEach((model) => {
      this[model.name] = model;
      model.__defineGetter__('knex', () => this._knex);
      model.__defineGetter__('registry', () => this);
    });

    this._knex = Knex(Object.assign({}, dbConfig));
  }
}

module.exports = Registry;
