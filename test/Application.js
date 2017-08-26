const { expect } = require('chai');
const { isFunction } = require('lodash');
const Application = require('../src/Application');

let isExpressRouter = (router) => {
  return isFunction(router.use) &&
    isFunction(router.get) &&
    isFunction(router.route);
};

let ApplicationConfig = {
  name: 'Sample',
  description: 'Sample Description',
  docsPath: '/docs/'
};

describe('Application', () => {
  let sampleApplication = new Application(ApplicationConfig);
  beforeEach(() => {
    sampleApplication = new Application(ApplicationConfig);
  });

  it('should be able to init', () => {

    expect(sampleApplication._name)
      .to.equal(ApplicationConfig.name);

    expect(sampleApplication._description)
      .to.equal(ApplicationConfig.description);
  });

  it('should look into sibling classes', () => {
    let siblings = [
      'Controller',
      'Parameter',
      'Response',
      'Handler'
    ];

    siblings.forEach(sibling => expect(Application[sibling]).to.equal(require(`../src/${sibling}`)));
  });

  it('should attach controllers', () => {
    let fired = false;
    let parentApp;
    let subConfig = {
      controllers: [{
        attachToApp(app) {
          parentApp = app;
          fired = true;
        }
      }]
    };

    const app = new Application(subConfig);
    expect(fired).to.be.true;
    expect(app).to.equal(parentApp);
  });

  it('should be able to init without a config', () => {
    const app = new Application();

    expect(isExpressRouter(app)).to.be.true;
  });

  it('should represent an express app', () => {
    expect(isExpressRouter(sampleApplication)).to.be.true;
  });

  it('should be able to have middleware attached to each controller', () => {
    const app = new Application();
    app.controllers = [{
      before: [],
      after: []
    }];

    app.onEach.controller.before(function() {
      expect(this).to.equal(app.controllers[0]);
    });

    app.onEach.controller.after(function() {
      expect(this).to.equal(app.controllers[0]);
    });

    app.controllers[0].before[0]();
    app.controllers[0].after[0]();
  });



  it('should be able to have middleware attached to each handler', () => {
    const app = new Application();
    app.controllers = [{
      handlers: [{
        before: [],
        after: []
      }],
    }];

    app.onEach.handler.before(function() {
      expect(this).to.equal(app.controllers[0].handlers[0]);
    });

    app.onEach.handler.after(function() {
      expect(this).to.equal(app.controllers[0].handlers[0]);
    });

    app.controllers[0].handlers[0].before[0]();
    app.controllers[0].handlers[0].after[0]();
  });

  it('should have a basic default error handler', () => {
    let statusCode, errorResponse;
    let sampleRes = {
      status(code) {
        statusCode = code;
        return {
          send(response) {
            errorResponse = response;
          }
        };
      }
    };

    Application.defaultErrorHandler('error', null, sampleRes);

    expect(statusCode).to.equal(500);
    expect(errorResponse).to.equal('error');
  });

  it('should be able to skip bodyParser', () => {
    const app = new Application({ skipBodyParser: true });
    expect(app._router.stack.length).to.be.lessThan(sampleApplication._router.stack.length);
  });
});