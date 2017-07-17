const { expect } = require('chai');
const { isFunction } = require('lodash');
const Controller = require('../src/Controller');
const Handler = require('../src/Handler');

let isExpressRouter = (router) => {
  return isFunction(router.use) &&
    isFunction(router.get) &&
    isFunction(router.route);
};
let controllerConfig = {
  basePath: '/',
  tag: ['Sample'],
  handlers: [],
  description: 'Some description',
  errorHandler(){}
};

describe('Controller', () => {
  let sampleController = new Controller(controllerConfig);
  beforeEach(() => {
    sampleController = new Controller(controllerConfig);
  });

  it('should initialize correctly', () => {
    expect(isExpressRouter(sampleController._router)).to.be.true;
    expect(sampleController._basePath).to.be.equal(controllerConfig.basePath);
    expect(sampleController.errorHandler).to.be.equal(controllerConfig.errorHandler);
  });

  it('should have defaults', () => {
    const defaultsCtrl = new Controller({});

    expect(defaultsCtrl._basePath).to.be.a('string');
    expect(defaultsCtrl._tag).to.be.a('string');
  });

  it('should load before middlewares', () => {
    controllerConfig.before = [
      (req, res, next) => {
        next();
      }
    ];
    controllerConfig.after = [
      (req, res, next) => {
        next();
      }
    ];
    sampleController = new Controller(controllerConfig);
    
    expect(sampleController._before).to.be
      .equal(controllerConfig.before);

    expect(sampleController._router.stack[0].handle)
      .to.be.equal(controllerConfig.before[0]);

    expect(sampleController._after).to.be.eql(controllerConfig.after);

    delete controllerConfig.before;
    delete controllerConfig.after;
  });

  it('should load handlers', () => {
    controllerConfig.handlers = [{
      attachToController: (item) => {
        expect(item).to.be.instanceof(Controller);
      }
    }];

    sampleController = new Controller(controllerConfig);

    delete controllerConfig.handlers;
  });

  it('should load render paths', () => {
    sampleController._paths = {
      "/v1/api/:id": {}
    };

    let expectedPaths = {
      "/v1/api/{id}": {}
    };

    expect(sampleController.paths()).to.be.eql(expectedPaths);
  });

  it('should be able to attach to an existing app', () => {
    let app = {
      use: (basePath, handler) => {
        expect(basePath).to.be.equal(controllerConfig.basePath);
        expect(handler).to.be.equal(sampleController._router);
      },
      controllers: []
    };

    sampleController.attachToApp(app);

    expect(sampleController._app).to.be.equal(app);
    expect(app.controllers[0]).to.be.equal(sampleController);
  });


  it('should be able to have after middleware', () => {
    controllerConfig.after = [
      () => {}
    ];
    sampleController = new Controller(controllerConfig);
    let app = {
      use(){},
      controllers: []
    };

    sampleController.attachToApp(app);

    expect(sampleController._router.stack[0].handle).to.be.equal(controllerConfig.after[0]);

    delete controllerConfig.after;
  });

  it("should grab the app's error handler", () => {
    let oldError = controllerConfig.errorHandler;
    delete controllerConfig.errorHandler;
    
    sampleController = new Controller(controllerConfig);

    let app = {
      use(){},
      controllers: [],
      errorHandler(){}
    };

    sampleController.attachToApp(app);

    expect(sampleController.errorHandler).to.be.equal(app.errorHandler);

    controllerConfig.errorHandler = oldError;
  });

  it('should be able to handle a handler', () => {
    let handler = {
      description: 'handler description',
      path: '/somePath',
      method: 'get',
      params: [{
        toSwagger: () => ({})
      }],
      responses: [{
        statusCode: 200,
        toSwagger: () => ({})
      }],
      getRouteHandler(){
        return () => {};
      },
      before: [],
      after: []
    };

    sampleController._handle(handler);

    expect(handler._controller).to.be.equal(sampleController);
    expect(sampleController._paths['/somePath'].get).to.be.eql({
      summary: handler.description,
      tags: ['Sample'],
      parameters: [{}],
      responses: {
        [200]: {}
      }
    });
  });

  it('should be able to handle a hidden handler', () => {
    let handler = {
      description: 'handler description',
      path: '/someHiddenPath',
      method: 'get',
      skipDocs: true,
      getRouteHandler(){
        return () => {};
      },
      before: [],
      after: []
    };

    sampleController._handle(handler);

    expect(handler._controller).to.be.equal(sampleController);
    expect(sampleController._paths['/someHiddenPath']).to.be.undefined;
  });

  it('should be able to construct a handler', () => {
    let handler = {
      path: '/somePath',
      skipDocs: true,
      handler() {},
      before: [],
      params: [],
      responses: [],
      after: []
    };

    let newHandler = sampleController.handler(handler);

    expect(newHandler).to.be.an.instanceOf(Handler);
    expect(newHandler._controller).to.equal(sampleController);
  });

  it('should have handler helpers', () => {
    let helpers = [
      'get',
      'put',
      'post',
      'delete',
      'patch'
    ];

    let oldHandle = sampleController._handle;
    sampleController._handle = method => method;

    helpers.forEach(helper => {
      let handler = {};
      sampleController[helper](handler);
      expect(handler.method).to.be.equal(helper);
    });

    sampleController._handle = oldHandle;
  });

  it('should be able to validate a request', () => {
    let sampleValidReq = {
      isValid: true
    };
    let sampleInvalidReq = {
      isValid: false
    };
    
    let responseCount = 0;
    let response = {
      status: (code) => ({
        send: ({message}) => {
          ++responseCount;
          expect(code).to.be.equal(400);
          expect(message).to.be.equal('invalid');
        }
      })
    };

    let nextCount = 0;
    let next = (val) => {
      ++nextCount;
      expect(val).to.be.undefined;
    };

    let params = [{
      validateRequest(req){
        return {
          valid: req.isValid,
          reason: 'invalid'
        };
      }
    }];

    let validator = sampleController.validate(params);

    validator(sampleValidReq, response, next);
    validator(sampleInvalidReq, response, next);

    expect(nextCount).to.be.equal(1);
    expect(responseCount).to.be.equal(1);
  });
});