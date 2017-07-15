const inflect = require('pluralize');

const Types = {
  String: 'String',
  Number: 'Number',
  Model: 'Model',
  Models: 'Models',
  Date: 'Date',
  Boolean: 'Boolean',
  JSON: 'JSON'
};

const SchemaTypes = {
  [Types.String]: String,
  [Types.Number]: Number,
  [Types.Boolean]: Boolean,
  [Types.Date]: Date,
  get [Types.Model]() {
    return require('./Model');
  },
  get [Types.Models](){
    return [require('./Model')];
  },
  [Types.JSON]: JSON
};

const primitiveTypes = {
  String(input) {
    let { maxLength, minLength, pattern, format, enum: enumVal } = input;

    if (pattern) {
      pattern = pattern.toString();
    }

    return {
      type: 'string',
      maxLength,
      minLength,
      pattern,
      format,
      enum: enumVal
    };
  },
  Number(input) {
    let { multipleOf, minimum, maximum, exclusiveMaximum, exclusiveMinimum } = input;
    return {
      type: 'number',
      multipleOf,
      minimum,
      maximum,
      exclusiveMaximum,
      exclusiveMinimum
    };
  },
  JSON() {
    return {};
  },
  Date() {
    return {
      type: 'string',
      format: 'date-time'
    };
  },
  Boolean() {
    return {
      type: 'boolean'
    };
  },
  Model({ relatedModel }, key) {
    if (!relatedModel) {
      relatedModel = inflect.singular(key);
      relatedModel = relatedModel[0].toUpperCase() + relatedModel.slice(1);
    }

    return {
      $ref: `#/definitions/${relatedModel}`
    };
  },
  Models({ relatedModel }, key) {
    if (!relatedModel) {
      relatedModel = inflect.singular(key);
      relatedModel = relatedModel[0].toUpperCase() + relatedModel.slice(1);
    }
    return {
      items: {
        $ref: `#/definitions/${relatedModel}`
      },
      type: 'array'
    };
  }
};
class Schema {
  constructor(schemaDefinition) {
    this._original = schemaDefinition;
    this._formatted = {};
    Object.keys(schemaDefinition).forEach(key => {
      if (!schemaDefinition[key].type) throw new ReferenceError('No type specified for ' + key + ' (nested objects are not supported)');
      if (!SchemaTypes[schemaDefinition[key].type]) throw new ReferenceError('Unknown type ' + schemaDefinition[key].type);

      this._formatted[key] = this._original[key];
    });
  }

  castInput(props) {
    const formatted = {};
    Object.keys(this._formatted).forEach(key => {
      const { type } = this._formatted[key];
      if (![Types.Model, Types.Models].includes(type)) {
        formatted['_' + key] = props[key];

        formatted.__defineGetter__(key, () => {
          return new SchemaTypes[type](formatted['_' + key]);
        });

        formatted.__defineSetter__(key, (value) => {
          formatted['_' + key] = value;
          return formatted[key];
        });
      }
    });
    return formatted;
  }

  get jsonSchema() {
    const withRefs = {
      title: this._model ? this._model.tableName : undefined,
      type: 'object',
      properties: {},
      required: []
    };

    const withoutRefs = {
      title: withRefs.title,
      type: 'object',
      properties: {},
      required: withRefs.required
    };

    Object.keys(this._formatted).forEach(key => {
      if (this._formatted[key].required) {
        withRefs.required.push(key);
      }
      let { type } = this._formatted[key];
      withRefs.properties[key] = primitiveTypes[type](this._formatted[key], key);

      if (![Types.Model, Types.Models].includes(type)) {
        withoutRefs.properties[key] = withRefs.properties[key];
      }
    });

    return { withRefs, withoutRefs };
  }
}

Schema.Types = Types;

module.exports = Schema;