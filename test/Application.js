const { expect } = require('chai');
const { isFunction } = require('lodash');
const Application = require('../src/Application');

let isExpressRouter = (router) => {
  return isFunction(router.use) &&
    isFunction(router.get) &&
    isFunction(router.route);
};

let ApplicationConfig = {
  basePath: '/sample',
  tag: ['Sample'],
  handlers: [],
  description: 'Some description',
  errorHandler(){}
};

describe('Application', () => {
  let sampleApplication = new Application(ApplicationConfig);
  beforeEach(() => {
    sampleApplication = new Application(ApplicationConfig);
  });

  it('should be able to init', () => {
    expect(sampleApplication._basePath)
      .to.equal(ApplicationConfig.basePath);

    expect(sampleApplication._description)
      .to.equal(ApplicationConfig.description);

    expect(sampleApplication._handlers)
      .to.equal(ApplicationConfig.handlers);

    expect(sampleApplication.errorHandler)
      .to.equal(ApplicationConfig.errorHandler);
    
    expect(sampleApplication._tag)
      .to.equal(ApplicationConfig.tag);
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
          expect(app).to.equal(parentApp);
          fired = true;
        }
      }]
    };

    parentApp = new Application(subConfig);
    expect(fired).to.be.true;
  });

  it('should represent an express app', () => {
    expect(isExpressRouter(sampleApplication)).to.be.true;
  });
});