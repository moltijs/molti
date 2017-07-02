const AJV = require('ajv');
const mongoose = require('mongoose');
const events = require('events');
const { clone, isString, isFunction, isObject } = require('lodash');

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
function Model(tableName, schema, {validateOnInit = false, idColumn = 'id', deletedAtColumn = null, underscored = false} = {}) {
  let jsonSchema = schema;
  if (schema instanceof Schema) {
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

    _guessColumnName(table, column = this.registry[table].idColumn) {
      return underscored ?
        (table + '_' + column) :
        (table + column[0].toUpperCase() + column.slice(1));
    }

    static create(props) {
      return new this(props).save();
    }

    static async find(queryInput, fields = '*') {
      let query = this.getQuery().select(fields);
      
      if (isFunction(queryInput)) {
        queryInput(query);
      } else if (isObject(queryInput)) {
        query.where(queryInput);
      }

      let data = await query;
      return data.map(row => {
        row = new this(row);
        row._persisted = true;
        return row;
      });
    }

    static async findById(id, fields = '*') {
      let props = await this.knex(tableName).where(idColumn, id).select(fields);
      if (props.length) {
        let foundRecord = new this(props[0]);
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
      return Promise.all(results.map(async (result) => result.destroy()));
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

      if (this._persisted) {
        await this.knex(tableName)
          .where(idColumn, this[idColumn])
          .update(this._changes);

        return this;
      } else {
        let [id] = await this.knex(tableName).insert(this._props);
        this._props[idColumn] = id;
        this._setProps(this._props);
        this._persisted = true;

        return this;
      }
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
      return JSON.stringify(this._props);
    }

    validate() {
      let valid = ajv.validate(jsonSchema, this);
      this.errors = ajv.errors;
      return valid;
    }

    pullAll(relatedTable, {
      localField = idColumn,
      relatedField,
      through,
      interLocalField,
      interRelatedField
    } = {}) {
      if (isString(relatedTable)) relatedTable = this.registry[relatedTable];

      relatedField = relatedField || this._guessColumnName(tableName, localField);

      if (through) {
        through = isString(through) ? through : this._guessColumnName(tableName, relatedTable.tableName);

        interLocalField = interLocalField || this._guessColumnName(tableName);
        interRelatedField = interRelatedField || this._guessColumnName(relatedTable.tableName);
      }


      let relatedValue = this[localField];

      return this.pullRelated({relatedTable, relatedField, relatedValue, through, interLocalField, interRelatedField, many: true});
    }

    pullOnly(relatedTable, {
      relatedField,
      localField,
      through,
      interLocalField,
      interRelatedField
    } = {}) {
      if (isString(relatedTable)) relatedTable = this.registry[relatedTable];

      relatedField = relatedField || relatedTable.idColumn;
      localField = localField || this._guessColumnName(relatedTable.tableName, relatedField);

      if (through) {
        through = isString(through) ? through : this._guessColumnName(relatedTable.tableName, tableName);

        interLocalField = interLocalField || this._guessColumnName(tableName);
        interRelatedField = interRelatedField || this._guessColumnName(relatedTable.tableName);
      }

      let relatedValue = this[localField];
      return this.pullRelated({relatedTable, relatedField, relatedValue, through, interLocalField, interRelatedField, many: false});
    }

    async pullRelated({
      relatedTable,
      relatedField,
      relatedValue,
      many,
      through,
      interLocalField,
      interRelatedField
    }) {
      if (!relatedTable) {
        throw new ReferenceError('Unknown table ' + relatedTable);
      }

      let remoteQuery = {
        [relatedField]: relatedValue
      };

      if (through) {
        remoteQuery = query => {
          query.whereIn(relatedTable.idColumn, this.knex(through).where(interLocalField, 1).select(interRelatedField));
        };
      }

      let results = await relatedTable.find(remoteQuery);

      return many ? results : results[0];
    }


  }

  return ModelInstance;
}

module.exports = { Model };