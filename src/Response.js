class ExtensibleFunction extends Function {
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

/**
 * @prop {string} name Name of the property
 * @prop {string} prop Type of property
 * @prop {boolean} isRef Is this a reference to a model
 * @prop {boolean} isArr Is this a list of results
 * 
 * @typedef ResponseAttr
 */

class Response extends ExtensibleFunction {
  /**
   * Creates an instance of Response.
   * 
   * @prop {ResponseAttr[]} attrs Attributes of the response
   * @memberOf Response
   */
  constructor(statusCode, description) {
    super((input) => this._responseHandler(input));
    this.statusCode = statusCode;
    this.description = description || '';
    this.attrs = [];
  }

  toSwagger() {
    let swaggerRef = {
      schema: {
        description: this.description,
        properties: {}
      }
    };
    this.attrs.forEach(attr => {
      let $ref = `#/definitions/${attr.type}`;
      let type = attr.type;
      let propVal = attr.isRef ? {$ref} : {type};

      swaggerRef.schema.properties[attr.name] = attr.isArr ? {
        type: 'array',
        items: propVal
      } : propVal;
    });

    return swaggerRef;
  }

  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  }

  describe(description) {
    this.description = description;
    return this;
  }

  alias(name) {
    this._name = name;
    return this;
  }

  ref(name, refName) {
    this.attrs.push({
      isRef: true,
      name: name,
      type: refName,
      isArr: false
    });
    return this;
  }

  refList(name, refName) {
    this.attrs.push({
      isRef: true,
      name: name,
      type: refName,
      isArr: true
    });
    return this;
  }

  prop(name, type) {
    this.attrs.push({
      isRef: false,
      name: name,
      type,
      isArr: false
    });
    return this;
  }

  propList(name, type) {
    this.attrs.push({
      isRef: false,
      isArr: true,
      name: name,
      type
    });
    return this;
  }

  _responseHandler(handlerResult) {
    let statusCode = this.statusCode;
    let response = {};

    this.attrs.forEach(attr => {
      response[attr.name] = handlerResult[attr.name];
    });

    return {
      response,
      statusCode,
      origin: this
    };
  }

  getResp() {
    return (handlerResult) => this._responseHandler(handlerResult);
  }
}

module.exports = Response;