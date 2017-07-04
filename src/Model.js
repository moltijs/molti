const AJV = require('ajv');
const mongoose = require('mongoose');
const events = require('events');
const { clone, isString, isFunction, isObject } = require('lodash');
const { is, pluck } = require('ramda');

require('mongoose-schema-jsonschema')(mongoose);
const { Schema } = mongoose;

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
function Model(tableName, schema, {timestamps = false, validateOnInit = false, idColumn = 'id', deletedAtColumn = null, underscored = false, createdAtColumn, updatedAtColumn} = {}) {
  let jsonSchema = schema;
  if (isFunction(schema.jsonSchema)) {
    jsonSchema = schema.jsonSchema();
  }

  const ajv = new AJV({
    allErrors: true,
    coerceTypes: true
  });

  /**
   * @prop {knex.Knex} knex A context specific knex instance
   * 
   * @class ModelInstance
   */
  class ModelInstance {
    /**
     * Creates an instance of ModelInstance.
     * @param {object} props 
     * @memberof ModelInstance
     */
    constructor(props) {
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

    static get tableName() {
      return tableName;
    }

    static get schema() {
      return schema;
    }

    static get modelName() {
      return this.name;
    }

    static get idColumn() {
      return idColumn;
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
      registry[tableName] = this;
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
      let query = this.knex(tableName);
      if (this._softDelete) {
        query.whereNull(deletedAtColumn);
      }
      return query;
    }

    static _guessColumnName(table, column = this.registry[table].idColumn) {
      return underscored ?
        (table + '_' + column) :
        (table + column[0].toUpperCase() + column.slice(1));
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

    static async _handleWithRelated(instances = [], withRelated) {
      let relatedTree = withRelated.split('.').filter(val => val);
      
      if (instances.length > 0) {
        let [relatedAttr] = relatedTree;

        if (!instances[0][relatedAttr]) throw new ReferenceError('No such attribute ' + relatedAttr);

        instances[0]._fetching = true;
        let relDef = instances[0][relatedAttr]();
        instances[0]._fetching = false;

        relDef.instances = instances;

        let {relatedTable} = relDef;

        if (isString(relatedTable)) relatedTable = this.registry[relatedTable];

        let results = await this._pullRelated(relDef, true);

        instances.forEach(instance => {
          instance._relationships = Object.assign(instance._relationships || {}, {
            [relatedTable.tableName]: results.map[instance[relDef.localField]]
          });
        });

        if (relatedTree[1]) {
          await relatedTable._handleWithRelated(results.array, relatedTree.slice(1).join('.'));
        }

      } else {
        return instances;
      }
    }

    static async findById(id, {fields = '*', withRelated = []} = {}) {
      let [props] = await this.getQuery().where(idColumn, id).select(fields);
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
        throw new ReferenceError(this.name + ' does not support soft deletes');
      }
      await this.knex(tableName)
        .where(idColumn, id)
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

    get registry() {
      return this.constructor.registry;
    }

    get query() {
      return this.constructor.getQuery();
    }

    async save(options = defaultSaveOptions) {

      if (options.validate && !this.validate()) {
        throw this.errors;
      }

      if (timestamps) {
        const timestampColumn = (this._persisted ? updatedAtColumn : createdAtColumn) ||
          this.constructor._guessColumnName(
            this._persisted ? 'updated': 'created',
            'at'
          );
        this._props[timestampColumn] = Date.now();
      }

      if (this._persisted) {
        await this.knex(tableName)
          .where(idColumn, this[idColumn])
          .update(this._changes);

      } else {
        let [id] = await this.knex(tableName).insert(this._props);

        this._props[idColumn] = id;
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
        .where(idColumn, this[idColumn]);
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

    toJSON() {
      return this._props;
    }

    validate() {
      let valid = ajv.validate(jsonSchema, this);
      this.errors = ajv.errors;
      return valid;
    }

    get _guessColumnName() {
      return this.constructor._guessColumnName;
    }

    /**
     * 
     * @typedef relationshipDefinition
     * 
     * @prop {string} localField field on this table that matches the related field (will guess based on this id column)
     * @prop {string} relatedField field on related table that matches this local field (will guess based on related table and related id column)
     * @prop {string} through join table used for many to many relationships
     * @prop {string} interLocalField field on the join table that matches this local field (will guess based on this table and this id column)
     * @prop {string} interRelatedField field on the join table that matches the related field (will guess based on related table and related id column)
     */

    /**
     * 
     * 
     * @param {string} relatedTable 
     * @param {relationshipDefinition} relDef 
     * @memberof ModelInstance
     */
    hasMany (relatedTable, relDef = {}) {
      if (isString(relatedTable)) relatedTable = this.registry[relatedTable];

      relDef.relatedField = relDef.relatedField || this.constructor._guessColumnName(tableName, relDef.localField || idColumn);
      relDef.localField = relDef.localField || idColumn;


      if (relDef.through) {
        relDef.through = isString(relDef.through) ? relDef.through : this._guessColumnName(tableName, relatedTable.tableName);

        relDef.interLocalField = relDef.interLocalField || this._guessColumnName(tableName);
        relDef.interRelatedField = relDef.interRelatedField || this._guessColumnName(relatedTable.tableName);
      }

      return this._handleRelationshipReturn(Object.assign({}, relDef, {
        relatedTable: relatedTable.tableName,
        many: true
      }));
    }


    /**
     * 
     * 
     * @param {string} relatedTable 
     * @param {relationshipDefinition} relDef 
     * @memberof ModelInstance
     */
    belongsTo (relatedTable, relDef = {}) {
      if (isString(relatedTable)) relatedTable = this.registry[relatedTable];

      relDef.relatedField = relDef.relatedField || relatedTable.idColumn;
      relDef.localField = relDef.localField || this.constructor._guessColumnName(relatedTable.tableName, relDef.relatedField);

      return this._handleRelationshipReturn(Object.assign({}, relDef, {
        relatedTable: relatedTable.tableName,
        many: false
      }));
    }

    _handleRelationshipReturn (def) {
      return this._fetching ? def : (this._relationships[def.relatedTable] || []);
    }

    pullAll(relatedTable, relDef) {
      return this.constructor.pullAll(relatedTable, relDef, this);
    }

    static pullAll(relatedTable, {
      localField = idColumn,
      relatedField,
      through,
      interLocalField,
      interRelatedField
    } = {}, instances) {
      if (isString(relatedTable)) relatedTable = this.registry[relatedTable];

      relatedField = relatedField || this._guessColumnName(tableName, localField);

      if (through) {
        through = isString(through) ? through : this._guessColumnName(tableName, relatedTable.tableName);

        interLocalField = interLocalField || this._guessColumnName(tableName);
        interRelatedField = interRelatedField || this._guessColumnName(relatedTable.tableName);
      }

      return this._pullRelated({ relatedTable, relatedField, through, interLocalField, interRelatedField, localField, instances, many: true });
    }


    pullOnly(relatedTable, relDef) {
      return this.constructor.pullOnly(relatedTable, relDef, this);
    }

    static pullOnly(relatedTable, {
      relatedField,
      localField,
      through,
      interLocalField,
      interRelatedField
    } = {}, instances) {
      if (isString(relatedTable)) relatedTable = this.registry[relatedTable];

      relatedField = relatedField || relatedTable.idColumn;
      localField = localField || this._guessColumnName(relatedTable.tableName, relatedField);

      return this._pullRelated({relatedTable, localField, instances, relatedField, through, interLocalField, interRelatedField, many: false});
    }

    static async _pullRelated({
      relatedTable,
      relatedField,
      many,
      through,
      interLocalField,
      interRelatedField,
      instances,
      localField
    }, grouped) {
      if (isString(relatedTable)) {
        relatedTable = this.registry[relatedTable];
      }

      if (!relatedTable) {
        throw new ReferenceError('Unknown table ' + relatedTable);
      }

      let relatedValue = is(Array)(instances) ? pluck(localField)(instances) : [instances[localField]];

      let relatedQuery;

      switch (relatedValue.length) {
      case 0:
        return [];
      case 1:
        relatedQuery = query => {
          query.where(relatedField, relatedValue[0]);
          return query;
        };
        break;
      default:
        relatedQuery = query => {
          query.whereIn(relatedField, relatedValue);
          return query;
        };
      }

      if (through) {
        relatedQuery = query => {
          query.join(through, `${relatedTable.tableName}.${relatedTable.idColumn}`, `${through}.${interRelatedField}`);

          query.whereIn(`${interLocalField}`, relatedValue);

          return query;
        };
      }

      let results = await relatedTable.find(relatedQuery, {}, true);

      if (grouped) {
        let map = {};
        results.forEach(result => {
          const mapKey = through ? result[interRelatedField] : result[relatedField];
          if (many) {
            (map[mapKey] = map[mapKey] || []).push(result);
          } else {
            map[mapKey] = result;
          }
        });
        return {map, array: results};
      }

      return many ? results : results[0];
    }
  }

  return ModelInstance;
}

module.exports = Model;