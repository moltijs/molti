const { expect } = require('chai');
const Handler = require('../src/Handler');

describe('Handler', () => {
  it('should block handlers without a configuration', () => {
    let error;
    try {
      new Handler();
    } catch(err) {
      error = err;
    }
    expect(error.message).to.be.equal('Options object not passed to Handler');
  });

  it('should block handlers without a configuration', () => {
    let error;
    try {
      new Handler({});
    } catch(err) {
      error = err;
    }
    expect(error.message).to.be.equal('Handler.handler is not a function');
  });

  it('should be able to attach to an arbitrary "controller"', () => {
    let sampleHandler = new Handler({
      handler(){}
    });

    let mockController = {
      get: (handler) => {
        expect(handler).to.be.equal(sampleHandler);
      },
      _app: {
        _utils: []
      }
    };
    sampleHandler.attachToController(mockController);
  });

  it('should create a route handler', async () => {
    let mockResponse = {
      status: code => ({
        send: data => {
          expect(code).to.be.equal(200);
          return {data, code};
        }
      })
    };
    let sampleHandler = new Handler({
      handler(params, responses) {
        expect(responses[300]).not.to.be.undefined;
        return responses.success({});
      },
      params: [],
      responses: [{
        _name: 'success',
        statusCode: 200,
        getResp(){
          return (response) => {
            return {response, statusCode: 200};
          };
        }
      }, {
        statusCode: 300,
        getResp() {
          return () => {};
        }
      }]
    });
    sampleHandler._controller = {
      errorHandler(err){
        throw err;
      },
      _app: {
        _utils: []
      }
    };

    let handler = sampleHandler.getRouteHandler();
    expect(typeof handler).to.be.equal('function');

    await handler({}, mockResponse, null);
  });

  it('should handle no return', async () => {
    let mockResponse = {
      status: code => ({send: () => expect(code).to.be.equal(500)})
    };
    let sampleHandler = new Handler({
      handler() {},
      params: [],
      responses: []
    });
    sampleHandler._controller = {
      errorHandler(err){
        throw err;
      },
      _app: {
        _utils: []
      }
    };

    await sampleHandler.getRouteHandler()({}, mockResponse, null);
  });

  it('should block invalid requests', async () => {

    let mockResponse = {
      status: code => ({send: () => expect(code).to.be.equal(400)})
    };
    let sampleHandler = new Handler({
      handler() {},
      params: [{validateRequest: () => ({valid: false})}],
      responses: []
    });
    sampleHandler._controller = {
      errorHandler(err){
        throw err;
      }
    };

    await sampleHandler.getRouteHandler()({}, mockResponse, null);
  });

  it('should go through the error handler', async () => {

    let mockResponse = {
      status: code => ({send: () => expect(code).to.be.equal(400)})
    };
    let sampleHandler = new Handler({
      handler() {
        throw new Error('should be here');
      },
      params: [],
      responses: []
    });
    sampleHandler._controller = {
      errorHandler(err){
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.be.equal('should be here');
      },
      _app: {
        _utils: []
      }
    };

    await sampleHandler.getRouteHandler()({}, mockResponse, null);
  });


  it('should application utils', async () => {
    let mockResponse = {
      status: () => ({send(){}})
    };
    let something = 'something';
    let fired = false;
    let sampleHandler = new Handler({
      handler(params, responses, utils) {
        expect(utils.something).to.equal(something);
        fired = true;
        return {};
      },
      params: [],
      responses: []
    });
    

    sampleHandler._controller = {
      errorHandler(){},
      _app: {
        _utils: [
          function (req) {
            this.something = req.something;
          }
        ]
      }
    };

    await sampleHandler.getRouteHandler()({ something }, mockResponse, null);

    expect(fired).to.be.true;
  });
});