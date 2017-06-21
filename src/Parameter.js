const {isEmpty, isUndefined, isNull, isString} = require('lodash');

class Parameter {
  /**
   * Creates an instance of Param.
   * @param {string} input - Either the param or an object describing the param
   * @param {string} param - Parameter on request to be validated
   * @param {'body'|'headers'|'path'|'query'|''=''} location - Where on the request
   * @param {string} description - Description of parameter for swagger
   * @param {boolean=false} isRequired - Is the request invalid without this parameter
   * @param {string} type - The type check on the request's param
   * @param {boolean=false} allowNull - Allow null value
   * 
   * @memberOf Param
   */
  constructor(param='', location='', description='', isRequired=false, type='', allowNull=false) {
    this._param = param;
    this._location = location;
    this._description = description;
    this._required = isRequired;
    this._type = type;
    this._allowNull = allowNull;
  }

  get valid() {
    return !isEmpty(this._param) && !isEmpty(this._location) && !isEmpty(this._type);
  }

  /**
   * Appends the existing 'attr' with the value or returns the previously set value
   * 
   * @param {string} attr Attribute to append
   * @param {string|boolean|undefined} val Value to append
   * @returns {Param|string|boolean} The instance on which this method was called or the 'attr' requested
   * 
   * @memberOf Param
   */
  _set(attr, val) {
    if(isUndefined(val)) return this[attr];

    this[attr] === '' ? (this[attr] = val) : (this[attr] += `|${val}`);
    return this;
  }
  /**
   * Replaces the existing 'attr' with the value or returns the previously set value
   * 
   * @param {string} attr Attribute to replace
   * @param {string|boolean|undefined} val Value to replace with
   * @returns {Param|string|boolean} The instance on which this method was called or the 'attr' requested.
   * 
   * @memberOf Param
   */
  _setStrict(attr, val) {
    if(isUndefined(val)) return this[attr];

    this[attr] = val;
    return this;
  }
  /**
   * Sets the param for the 
   * 
   * @param {string|undefined} val 
   * @returns {Param|string} The instance on which this method was called or the existing param of the param
   * 
   * @memberOf Param
   */
  param(val) {
    return this._setStrict('_param', val);
  }

  /**
   * Sets the location of the param or retrieves the location if no val is specified
   * 
   * @param {string|undefined} val Value to set the location to
   *
   * @returns {Param|string} The instance on which this method was called or the location of the param.
   * 
   * @memberOf Param
   */
  location(val) {
    return this._set('_location', val);
  }

  /**
   * Sets the location of the param to the body
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  body() {
    return this._set('_location', 'body');
  }

  /**
   * Sets the location of the param to the query
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  query() {
    return this._set('_location', 'query');
  }

  /**
   * Sets the location of the param to the header
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  headers() {
    return this._set('_location', 'headers');
  }

  /**
   * Sets the location of the param to the path
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  path() {
    return this._set('_location', 'path');
  }


  /**
   * Sets the type of the param or retrieves the type if no val is specified
   * 
   * @param {string|undefined} val Value to set the type to
   *
   * @returns {Param|string} The instance on which this method was called or the type of the param.
   * 
   * @memberOf Param
   */
  type(val) {
    return this._set('_type', val);
  }

  /**
   * Sets the param to allow any type to be passed
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  any() {
    return this._setStrict('_type', 'any');
  }

  /**
   * Sets the type of validation to number
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  number() {
    return this._set('_type', 'number');
  }
  
  /**
   * Sets the type of validation to string
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  string() {
    return this._set('_type', 'string');
  }

  /**
   * Sets the type of validation to boolean
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  boolean() {
    return this._set('_type', 'boolean');
  }

  /**
   * Marks the param to require the attribute
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  require() {
    return this._setStrict('_required', true);
  }

  /**
   * Allows null as a valid value
   * 
   * @returns {Param} The instance on which this method was called.
   * 
   * @memberOf Param
   */
  allowNull() {
    return this._setStrict('_allowNull', true);
  }

  describe(description) {
    return this._setStrict('_description', description);
  }

  toSwagger() {
    return {
      name: this._param,
      in: this._location,
      description: this._description,
      required: this._required,
      type: this._type === 'any' ? 'object' : this._type
    };
  }
  /**
   * 
   * 
   * @param {Express.Request} request 
   * @returns boolean
   * 
   * @memberOf Param
   */
  validateExists(request) {
    let existsVal = this.getValFromRequest(request);
    return !isUndefined(existsVal) && (this._allowNull || !isNull(existsVal));
  }
  applyToRequest(params, val) {
    params[this._param] = val;
  }
  /**
   * 
   * 
   * @param {any} request 
   * @returns 
   * 
   * @memberOf Param
   */
  getValFromRequest(request) {
    switch (this._location) {
    case 'path':
      return request.params[this._param];
    case 'query':
    case 'body':
      return request[this._location][this._param];
    case 'headers':
      return request.get(this._param);
    }
  }
  /**
   * Handles the evaluation of a number param
   * 
   * @param {any} val The value that could be a number
   * 
   * @return {number|false} The parsed number (if applicable)
   * @memberOf Param
   */
  handleNumber(val) {
    let numVal = parseFloat(val);

    return isNaN(numVal) ? undefined : numVal;
  }

  /**
   * Handles the evaluation of a bolean param
   * 
   * @param {any} val The value that could be a boolean
   * 
   * @return {boolean|false} The parsed boolean (if applicable)
   * @memberOf Param
   */
  handleBoolean(bool) {
    switch (bool) {
    case 'false':
    case '0':
      return false;
    case 'true':
    case '1':
      return true;
    }
  }

  /**
   * Handles the evaluation of a string param
   * 
   * @param {any} val The value that could be a string
   * 
   * @return {string|false} The same string (if applicable)
   * @memberOf Param
   */
  handleString(val) {
    return isString(val) ? ('' + val) : undefined;
  }
  validateRequest(request, params) {
    if (!this.validateExists(request)) {
      return {
        valid: this._required ? false : true,
        reason: 'missing required attribute ' + this._param + ' from ' + this._location
      };
    }

    let val = this.getValFromRequest(request);
    let potentialVal = val;

    switch(this._type) {
    case 'number':
      potentialVal = this.handleNumber(val);
      break;
    case 'string':
      potentialVal = this.handleString(val);
      break;
    case 'boolean':
      potentialVal = this.handleBoolean(val);
      break;
    }
    if (isUndefined(potentialVal)) {
      return {
        valid: false,
        reason: `${this._param} in the ${this._location} is not a ${this._type}`
      };
    }
    this.applyToRequest(params, potentialVal);
    return {
      valid: true,
      reason: ''
    };
  }
}

module.exports = Parameter;