//@ts-check
const { isNil, pluck } = require('ramda');
const { Router } = require('express');
const Handler = require('./Handler');

class Controller {
  /**
   * Creates an instance of Controller.
   * @param {string} basePath Base path to serve requests from
   * @param {string} tag Human readable name for swagger
   * @param {string} description Human readable description for swagger
   * 
   * @memberOf Controller
   */
  constructor({basePath='/', tag='No Tag', description='', before=[], after=[], handlers=[], errorHandler}) {
    this._basePath = basePath;
    this._router = Router();
    this._paths = {};
    this._handlers = handlers;
    this._description = description;
    this._tag = tag;
    this._before = before;
    this._after = after;
    this.errorHandler = errorHandler;

    if (this._before.length > 0) {
      this._router.use(...this._before);
    }

    this.handlers = handlers;

    handlers.forEach(handler => {
      handler.attachToController(this);
    });
  }

  paths() {
    let paths = {};
    Object.keys(this._paths)
      .forEach(path => {
        // convert /v1/api/:id -> /v1/api/{id}
        let swaggerPath = path.replace(/\/(:(\w+))/g, (subRoute, param, paramName) => subRoute.replace(param, `{${paramName}}`));

        paths[swaggerPath] = this._paths[path];
      });
    return paths;
  }
  /**
   * Attach the controller to the router
   * 
   * @param {Handler} router 
   * 
   * @memberOf Controller
   */
  attachToApp(app) {
    this._app = app;
    app.controllers.push(this);
    if (this._after.length > 0) {
      this._router.use(...this._after);
    }

    if (!this.errorHandler) {
      this.errorHandler = this._app.errorHandler;
    }

    app.use(this._basePath, this._router);
  }

  handler(config) {
    return new Handler(config).attachToController(this);
  }

  _handle(handler) {
    if (!(handler instanceof Handler)) handler = new Handler(handler);

    this.handlers.push(handler);

    let basePath = (this._basePath + handler.path).replace(/\/\//g, '/');
    handler._fullPath = basePath;
    handler._controller = this;

    if (!handler.skipDocs) {
      let description = handler.description;
  
      /* istanbul ignore else */
      if (isNil(this._paths[basePath])) {
        this._paths[basePath] = {};
      }
      this._paths[basePath][handler.method] = {
        summary: description,
        tags: this._tag,
        parameters: handler.params.map(param => param.toSwagger()),
        responses: handler.responses.reduce((responses, resp) => {
          responses[resp.statusCode] = resp.toSwagger();
          return responses;
        }, {})
      };
    }
    let routeHandler = handler.getRouteHandler().bind(handler);
    this._router[handler.method](handler.path, ...handler.before, routeHandler, ...handler.after);
    return handler;
  }
  get(handler) {
    handler.method = 'get';
    this._handle(handler);
  }
  put(handler) {
    handler.method = 'put';
    this._handle(handler);
  }
  patch(handler) {
    handler.method = 'patch';
    this._handle(handler);
  }
  post(handler) {
    handler.method = 'post';
    this._handle(handler);
  }
  delete(handler) {
    handler.method = 'delete';
    this._handle(handler);
  }
  /**
   * 
   * 
   * @param {Param[]} validations 
   * @returns undefined
   * 
  * @memberOf Controller
   */
  validate(params) {
    return (req, res, next) => {
      req._params = req.params;
      req.params = {};
      let invalidParams = params
        .map(param => param.validateRequest(req))
        .filter(paramResult =>  !paramResult.valid);

      if (invalidParams.length > 0) {
        return res.status(400).send({success: false, message: pluck('reason')(invalidParams).join()});
      }

      next();
    };
  }
}

module.exports = Controller;