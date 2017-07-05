const Knex = require('knex');
const { is, view, lensPath } = require('ramda');

/**
 * @typedef {Object.<string, function>} ModelMap
 * 
 * @memberOf ModelLoader
 */
/**
 * 
 * 
 * @class ModelLoader
 */
class ModelLoader {
  /**
   * Creates an instance of ModelLoader.
   * @param {Knex.Config} originKnexConfig Configuration for the core database instance.
   * @param {any[]} models Initial models to be loaded
   * @memberOf ModelLoader
   */
  constructor(originKnexConfig, models=[], dbTenantColumn = 'tenant') {
    this.origin = Knex(originKnexConfig);
    this.models = models;
    this.mappedModels = {};
    this.dbTenantColumn = dbTenantColumn;
  }
  /**
   * Pulls and associates the client level databases
   * 
   * @param {string} tableName Table name within the origin Knex instance
   * 
   * @memberOf ModelLoader
   */
  async pullTenants(tableName) {
    this.dbs = await this.origin(tableName).select('*');
    this.dbs.forEach(db => db.knex = Knex(db));
    return this.dbs;
  }
  /**
   * Loops through the attached dbs and creates new instances of each model for each database
   * 
   * @returns {Object.<string, ModelMap>}
   * 
   * @memberOf ModelLoader
   */
  attachModels() {
    const mappings = {};

    this.dbs.forEach(db => {
      mappings[db[this.dbTenantColumn]] = {};

      this.models.forEach(model => {
        mappings[db[this.dbTenantColumn]][model.name] = class extends model {
          static get knex() {
            return db.knex;
          }
        };
      });
    });

    return this.mappedModels = mappings;
  }

  helper (tenantIdExtractor) {
    if (!is(Function)(tenantIdExtractor)) {
      tenantIdExtractor = view(lensPath(tenantIdExtractor.split('.')));
    }
    let { mappedModels: models } = this;
    return function (req) {
      return this.models = models[tenantIdExtractor(req)];
    };
  }
}

module.exports = ModelLoader;