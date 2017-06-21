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
 * @param {mongoose.Schema|object} schema The structure of 
 * @param {any} [config=defaultConfiguration] 
 * @returns 
 */
function Model(tableName, schema, {validateOnInit = false, idColumn = 'id', deletedAtColumn} = {}) {
  let jsonSchema = schema;
  if (schema instanceof Schema) {
    jsonSchema = schema.jsonSchema();
  }

  class ModelInstance {
    constructor(props) {
      this.ajv = new AJV({
        allErrors: true,
        coerceTypes: true
      });
      let validate = this.ajv.compile(jsonSchema);
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

    static get _softDelete() {
      return isString(deletedAtColumn);
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

    static getQuery() {
      let query = this.knex(tableName);
      if (this._softDelete) {
        query.whereNull(deletedAtColumn);
      }
      return query;
    }

    static async find(fields = '*', queryInput) {
      let query = this.getQuery().select(fields);
      
      if (isFunction(queryInput)) {
        queryInput(query);
      } else if (isObject(queryInput)) {
        query.where(queryInput);
      }

      return query.then(data => data
        .map(row => {
          row = new this(row);
          row._persisted = true;
          return row;
        }));
    }

    static async restore(id) {
      if (!this._softDelete) {
        throw new ReferenceError(this.name + ' does not support soft deletes');
      }
      await this.knex(tableName)
        .where(idColumn, id)
        .update(deletedAtColumn, null);
    }

    get changes() {
      return clone(this._changes);
    }

    async save(options = defaultSaveOptions) {
      if (options.validate && !this.validate()) {
        throw this.errors;
      }

      if (this._persisted) {
        await this.constructor.knex(tableName)
          .where(idColumn, this[idColumn])
          .update(this._changes);

        return this;
      } else {
        let [id] = await this.constructor.knex(tableName).insert(this._props);
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
      let deleteQuery = this.constructor.getQuery()
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

    validate() {
      let valid = this.ajv.validate(jsonSchema, this);
      this.errors = this.ajv.errors;
      return valid;
    }
  }

  return ModelInstance;
}

module.exports = {Model};