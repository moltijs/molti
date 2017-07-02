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

  it('should represent an express app', () => {
    expect(isExpressRouter(sampleApplication)).to.be.true;
  });
});