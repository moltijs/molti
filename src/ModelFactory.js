const AJV = require('ajv');
const { Types } = require('./ModelSchema');
const { clone, isString, isFunction, isObject } = require('lodash');
const { is, pluck } = require('ramda');
const inflect = require('pluralize');
const Strategy = require('./Strategy');

const defaultSaveOptions = {
  upsert: false,
  validate: true
};

/**
 * Assembles a Molti-Model class
 * 
 * @param {any} tableName Table for which the class is linked to
 * @param {Schema|object} schema The structure of 
 * @param {any} [config=defaultConfiguration] 
 * @returns 
 */
function Model(schema, config = {}) {
  let relationshipMap = {};
  let jsonSchema = schema.jsonSchema.withoutRefs;

  const {
    tableName,
    timestamps = false,
    validateOnInit = false,
    idColumn: idColumnInput,
    deletedAtColumn = null,
    createdAtColumn,
    updatedAtColumn,
    modelName
  } = config;

  Object.keys(schema._formatted).forEach((key) => {
    if ([Types.Models, Types.Model].includes(schema._formatted[key].type)) {
      relationshipMap[key] = schema._formatted[key];
    }
  });

  const ajv = new AJV({
    allErrors: true,
    coerceTypes: true
  });

  /**
   * @prop {knex.Knex} knex A context specific knex instance
   * 
   * @class ModelInstance
   */
  return class extends Strategy {
    /**
     * Creates an instance of ModelInstance.
     * @param {object} props 
     * @memberof ModelInstance
     */
    constructor(props) {
      super();

      let validate = ajv.compile(jsonSchema);
      let result = validate(props);

      if (!result && validateOnInit) {
        throw validate.errors;
      }

      this._setProps(props);

      // default to not-persisted
      this._persisted = false;
      this._fetching = false;
      this._relationships = {};
    }

    static formatRelationship({
      relatedModel,
      foreignField,
      localField,
      type,
      through,
      throughLocalField,
      throughForeignField
    }, attr) {
      if (!relatedModel) {
        let formattedRelatedAttr = attr[0].toUpperCase() + attr.slice(1);
        relatedModel = inflect.singular(formattedRelatedAttr);
      }

      if (is(String)(relatedModel)) relatedModel = this.registry[relatedModel];

      const many = type === Types.Models;
      
      localField = localField || (many ? this.idColumn : this.guessColumnName(relatedModel.tableName, relatedModel.idColumn));

      foreignField = foreignField || (many ? this.guessColumnName(this.tableName, this.idColumn) : relatedModel.idColumn);

      if (through) {
        if (!is(String)(through)) through = this.guessTableName(this.tableName, relatedModel.tableName, true);
 
        throughLocalField = throughLocalField || this.guessColumnName(this.tableName, this.idColumn);
        throughForeignField = throughForeignField || this.guessColumnName(relatedModel.tableName, relatedModel.idColumn);
      }

      return {
        relatedModel,
        foreignField,
        localField,
        type,
        through,
        throughLocalField,
        throughForeignField,
        many
      };
    }

    static get tableName() {
      return tableName || inflect.plural(this.modelName);
    }

    get tableName() {
      return this.constructor.tableName;
    }

    static get relationshipMap() {
      return relationshipMap;
    }

    static get schema() {
      return schema;
    }

    static get toSwagger() {
      return schema.jsonSchema.withRefs;
    }

    static get modelName() {
      return modelName || this.name;
    }

    static get idColumn() {
      return idColumnInput || this.guessIdColumn();
    }

    get idColumn() {
      return this.constructor.idColumn;
    }

    static get _softDelete() {
      return isString(deletedAtColumn);
    }
    /**
     * @param {object} registry
     * 
     * @private
     * @static
     * @memberof ModelInstance
     */
    static attachToRegistry(registry) {
      registry[this.modelName] = this;
      this.registry = registry;
    }

    /**
     * Returns a query with configuration parameters applied
     * 
     * @static
     * @returns Knex.Knex
     * @memberof ModelInstance
     */
    static getQuery() {
      let query = this.knex(this.tableName);
      if (this._softDelete) {
        query.whereNull(deletedAtColumn);
      }
      return query;
    }

    static create(props) {
      let newInstance = new this(props);
      return newInstance.save();
    }

    static async find(queryInput, {fields = '*', withRelated = []} = {}) {
      let query = this.getQuery().select(fields);
      
      if (isFunction(queryInput)) {
        queryInput(query);
      } else if (isObject(queryInput)) {
        query.where(queryInput);
      }

      let foundRows = (await query).map(row => {
        row = new this(row);
        row._persisted = true;
        return row;
      });

      for (let i = 0; i < withRelated.length; i++) {
        await this._handleWithRelated(foundRows, withRelated[i]);
      }

      return foundRows;
    }

    static async _handleWithRelated(instances, withRelated) {
      let relatedTree = withRelated.split('.').filter(val => val);

      if (instances.length > 0) {
        let [relatedAttr] = relatedTree;

        if (!relationshipMap[relatedAttr]) throw new ReferenceError('No such attribute ' + relatedAttr);
        
        let relDef = Object.assign({ instances }, this.formatRelationship(relationshipMap[relatedAttr], relatedAttr));

        let { relatedModel } = relDef;

        let results;

        if (!instances[0]._relationships[relatedAttr]) {
          results = await this._pullRelated(relDef, true);
          instances.forEach(instance => instance._relationships[relatedAttr] = results);
        } else {
          results = instances[0]._relationships[relatedAttr];
        }
        let relatedRelDef;

        Object.keys(relatedModel.relationshipMap).forEach(relName => {
          let currentRelDef = relatedModel.formatRelationship(relatedModel.relationshipMap[relName], relName);
          if (currentRelDef.foreignField === relDef.localField ||
            (
              currentRelDef.through && relDef.through &&
              currentRelDef.through === relDef.through &&
              currentRelDef.throughForeignField === relDef.throughLocalField &&
              currentRelDef.throughLocalField === relDef.throughForeignField
            )
            ) {
            relatedRelDef = Object.assign({ relName }, currentRelDef);
          }
        });

        instances.forEach(instance => {
          instance[relatedAttr] = results.map[instance[relDef.localField]];
          if (!instance[relatedAttr] && (relDef.type === Types.Models)) {
            instance[relatedAttr] = [];
          }
          if (relatedRelDef) {
            results.array.forEach(result => {
              if (!relatedRelDef.through && (result[relatedRelDef.localField] === instance[relDef.localField])) {
                if (relatedRelDef.type === Types.Models) {
                  (result[relatedRelDef.relName] = result[relatedRelDef.relName] || []).push(instance);
                  result;
                } else {
                  result[relatedRelDef.relName] = instance;
                }
              }
            });
          }
        });
        if (relatedTree.length > 1) {
          await relatedModel._handleWithRelated(results.array, relatedTree.slice(1).join('.'));
        }
      } else {
        return instances;
      }
    }

    static async findById(id, {fields = '*', withRelated = []} = {}) {
      let [props] = await this.getQuery().where(this.idColumn, id).select(fields);
      if (props) {
        let foundRecord = new this(props);
        for (let i = 0; i < withRelated.length; i++) {
          await this._handleWithRelated([foundRecord], withRelated[i]);
        }
        foundRecord._persisted = true;
        return foundRecord;
      } else {
        return null;
      }
    }

    static update(query, updates) {
      let updateQuery = this.getQuery();
      if (isFunction(query)) {
        query(updateQuery);
      } else {
        updateQuery.where(query);
      }

      return updateQuery.update(updates);
    }

    static async restore(id) {
      if (!this._softDelete) {
        throw new ReferenceError(this.modelName + ' does not support soft deletes');
      }
      await this.knex(this.tableName)
        .where(this.idColumn, id)
        .update(deletedAtColumn, null);
    }

    static async remove(queryInput) {
      let results = await this.find(queryInput);
      return Promise.all(results.map(async result => result.destroy()));
    }

    get changes() {
      return clone(this._changes);
    }

    get knex() {
      return this.constructor.knex;
    }

    get query() {
      return this.constructor.getQuery();
    }

    async save(options = defaultSaveOptions) {

      if (options.validate && !this.validate()) {
        throw this.errors;
      }

      if (timestamps) {
        if (!this._persisted) {
          this._props[createdAtColumn || this.constructor.guessColumnName('created', 'at')] = new Date();
        }

        this._props[updatedAtColumn || this.constructor.guessColumnName('updated', 'at')] = new Date();
      }

      if (this._persisted) {
        await this.knex(this.tableName)
          .where(this.idColumn, this[this.idColumn])
          .update(this._changes);

      } else {
        let results = await this.knex(this.tableName).insert(this._props).returning('id');
        this._props[this.idColumn] = results[0];
        this._persisted = true;
      }
      this._setProps(this._props);
      return this;
    }

    reset() {
      this._setProps(this._original);
    }

    destroy() {
      let deleteQuery = this.query
        .where(this.idColumn, this[this.idColumn]);
      if (this.constructor._softDelete) {
        return deleteQuery.update(deletedAtColumn, new Date);
      } else {
        return deleteQuery.del();
      }
    }

    _setProps(props) {
      this._original = clone(props);
      this._props = props;
      this._changes = {};

      for (let key in props) {
        this.__defineGetter__(key, () => this._props[key]);
        this.__defineSetter__(key, (value) => {
          this._props[key] = value;

          this._changes[key] = value;
        });
      }
    }

    toJSON(ignoredRecord) {
      let relMap = Object.keys(relationshipMap).reduce((map, relName) => {
        if (this[relName] && (this[relName] !== ignoredRecord)) {
          map[relName] = is(Array)(this[relName]) ?
            this[relName].filter(rec => rec !== ignoredRecord).map(rec => rec.toJSON(this)) :
            this[relName].toJSON(this);
        }
        return map;
      }, {});
      return Object.assign(relMap, this._props);
    }

    validate() {
      let valid = ajv.validate(jsonSchema, this);
      this.errors = ajv.errors;
      return valid;
    }

    async pullRelated(key) {
      let relDef = relationshipMap[key.tableName || key];
      if (relDef) {
        relDef = this.constructor.formatRelationship(relDef, key);
        return this[key] = (await this.constructor._pullRelated(Object.assign({ instances: this }, relDef))).array;
      } else {
        throw new ReferenceError('No such relationship: ' + key);
      }
    }

    static async _pullRelated(relDef) {
      const {
        relatedModel,
        foreignField,
        localField,
        through,
        throughLocalField,
        throughForeignField,
        many
      } = this.formatRelationship(relDef);
      const { instances } = relDef;
      let relatedValue = is(Array)(instances) ? pluck(localField)(instances) : [instances[localField]];

      let relatedQuery;

      switch (relatedValue.length) {
      case 1:
        relatedQuery = query => {
          query.where(foreignField, relatedValue[0]);
          return query;
        };
        break;
      default:
        relatedQuery = query => {
          query.whereIn(foreignField, relatedValue);
          return query;
        };
      }

      if (through) {
        relatedQuery = query => {
          query.join(through, `${relatedModel.tableName}.${relatedModel.idColumn}`, `${through}.${throughForeignField}`);

          query.whereIn(`${throughLocalField}`, relatedValue);

          return query;
        };
      }

      let results = await relatedModel.find(relatedQuery, {}, true);

      let map = {};
      results.forEach(result => {
        const mapKey = through ? result[throughLocalField] : result[foreignField];
        if (many) {
          (map[mapKey] = map[mapKey] || []).push(result);
        } else {
          map[mapKey] = result;
        }
      });
      return {map, array: results};
    }
  };
}

module.exports = Model;