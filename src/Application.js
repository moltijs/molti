const express = require('express');
const Controller = require('./Controller');
const Handler = require('./Handler');
const Parameter = require('./Parameter');
const Response = require('./Response');
const DocsRouter = require('./DocsRouter');
const bodyParser = require('body-parser');

let defaultErrorHandler = (err, req, res, next) => {
  res.status(500).send(err.message || err);
};

class Application extends express {
  /**
   * Creates an instance of Framework.
   * @param {Controller[]} controllers The controllers for this application
   * 
   * @memberOf Framework
   */
  constructor(options={}) {
    super();
    Object.assign(this, express());

    
    let {
      controllers = [],
      errorHandler = defaultErrorHandler,
      name = 'No name',
      description = 'No description',
      version = '0.0.0',
      host = 'localhost',
      schemes = ['https', 'http'],
      scheme = 'https',
      produces = ['application/json'],
      docsPath = '/docs/',
      paths = {},
      info = {},
      definitions = {},
      utils = [],
      responses = [],
      models = [],
      skipBodyParser
    } = options;
    
    if (!skipBodyParser) {
      this.use(bodyParser.text());
      this.use(bodyParser.urlencoded({ extended: false }));
      this.use(bodyParser.json());
    }

    this.controllers = controllers;
    this._name = name;
    this._utils = utils;
    this._description = description;
    this._version = version;
    this._host = host;
    this._schemes = schemes;
    this._scheme = scheme;
    this._produces = produces;
    this._paths = paths;
    this._definitions = definitions;
    this._info = info;
    this._responses = responses;
    /* istanbul ignore next */
    this.use((err, req, res, next) => errorHandler(err, req, res, next));
    this.errorHandler = errorHandler;

    this.use(docsPath, DocsRouter(this));

    controllers.forEach(ctrl => ctrl.attachToApp(this));
    models.forEach(model => this._definitions[model.modelName] = model.toSwagger);
  }

  static get Controller() {
    return Controller;
  }
  static get Parameter() {
    return Parameter;
  }
  static get Response() {
    return Response;
  }
  static get Handler() {
    return Handler;
  }
  static get defaultErrorHandler() {
    return defaultErrorHandler;
  }
}

module.exports = Application;