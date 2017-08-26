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
  [Types.String]: (input) => '' + input,
  [Types.Number]: (input) => +input,
  [Types.Boolean]: (input) => !!input,
  [Types.Date]: (input) => new Date(input),
  get [Types.Model]() {
    return require('./ModelFactory');
  },
  get [Types.Models](){
    return [require('./ModelFactory')];
  },
  [Types.JSON]: input => input.toJSON ? input.toJSON() : input
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
  /**
   * 
   * @param {Object} schemaDefinition Description of the schema being defined
   * @param {Object | Object[] | undefined} args Overloads the constructor to allow for redirecting to Schema.extending
   */
  constructor(schemaDefinition, ...args) {
    if (args.length > 0) {
      console.log('here');
      return Schema.extending(schemaDefinition, ...args);
    }

    this._original = schemaDefinition;
    this._formatted = {};
    Object.keys(schemaDefinition).forEach(key => {
      if (schemaDefinition[key]) {
        if (!schemaDefinition[key].type) throw new ReferenceError('No type specified for ' + key + ' (nested objects are not supported)');
        if (!SchemaTypes[schemaDefinition[key].type]) throw new ReferenceError('Unknown type ' + schemaDefinition[key].type);

        this._formatted[key] = this._original[key];
      }
    });
  }

  castInput(props) {
    const formatted = {};
    Object.keys(this._formatted).forEach(key => {
      const { type } = this._formatted[key];
      if (![Types.Model, Types.Models].includes(type)) {
        formatted['_' + key] = props[key];

        formatted.__defineGetter__(key, () => {
          return SchemaTypes[type](formatted['_' + key]);
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

      withRefs.properties[key].description = this._formatted[key].description;
      withRefs.properties[key].default = this._formatted[key].default;

      if (![Types.Model, Types.Models].includes(type)) {
        withoutRefs.properties[key] = withRefs.properties[key];
      }
    });

    return { withRefs, withoutRefs };
  }
}

/**
 * @param {Object} schemaDefinition The new schema definition including any properties to be overwritten of the baseDefinitions
 * @param {Object[] | Object} base Either an array of a single object of base definitions that the schemaDefinition is extending
 */
Schema.extending = function (schemaDefinition, ...base) {
  const builder = {};

  if (base[0] instanceof Array) {
    base = [...base[0]];
  }

  function mergePropertyDescriptions (left, right) {
    Object.keys(right).forEach(key => {
      if (right[key] !== undefined) {
        left[key] = right[key];
      } else if(left[key]) {
        delete left[key];
      }
    });

    return left;
  }

  function assignToBuilder (def) {
    // console.log(def);
    if (def instanceof Schema) {
      assignToBuilder(def._formatted);
    } else {
      Object.keys(def).forEach(key => {
        if (def[key]) {
          if (builder[key]) {
            builder[key] = mergePropertyDescriptions(builder[key], def[key]);
          } else {
            builder[key] = def[key];
          }
        }
      });
    }
  }

  let reversed = [];
  for (let arg of base) {
    reversed = [arg, ...reversed];
  }

  reversed.forEach(assignToBuilder);

  assignToBuilder(schemaDefinition);

  return new Schema(builder);
};

Schema.Types = Schema.SchemaTypes = Types;
Schema._primitives = primitiveTypes;

module.exports = Schema;
