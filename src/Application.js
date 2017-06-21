const express = require('express');
const Controller = require('./Controller');
const Handler = require('./Handler');
const Parameter = require('./Parameter');
const Response = require('./Response');
const DocsRouter = require('./DocsRouter');

let defaultErrorHandler = (err, req, res, next) => {
  res.status(500).send(err);
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
      definitions = {}
    } = options;

    this.controllers = controllers;
    this._name = name;
    this._description = description;
    this._version = version;
    this._host = host;
    this._schemes = schemes;
    this._scheme = scheme;
    this._produces = produces;
    this._paths = paths;
    this._definitions = definitions;
    this._info = info;
    this.use((err, req, res, next) => {
      errorHandler(err, req, res, next);
    });
    this.errorHandler = errorHandler;

    this.use(docsPath, DocsRouter(this));

    controllers.forEach(ctrl => ctrl.attachToApp(this));
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