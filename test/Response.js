const Response = require('../src/Response');
const Generics = require('../src/Generics');
const { expect } = require('chai');
const { is } = require('ramda');

describe('Response', () => {
  let sampleResponse = new Response();
  beforeEach(() => {
    sampleResponse = new Response();
  });

  describe('description', () => {
    it('should be able to set the status, description, and name', () => {
      sampleResponse
        .name('some name')
        .status(200)
        .describe('some description');

      expect(sampleResponse.statusCode).to.be.equal(200);
      expect(sampleResponse.description).to.be.equal('some description');
      expect(sampleResponse._name).to.be.equal('some name');
    });
  });
  describe('attributes', () => {
    it('should be able to add all attribute types', () => {
      sampleResponse
        .ref('model', 'some model')
        .refList('models', 'some other model')
        .prop('attribute', 'string')
        .propList('attributes', 'number');

      expect(sampleResponse.attrs).to.be.eql([{
        isRef: true,
        name: 'model',
        type: 'some model',
        isArr: false
      }, {
        isRef: true,
        name: 'models',
        type: 'some other model',
        isArr: true
      }, {
        isRef: false,
        name: 'attribute',
        type: 'string',
        isArr: false
      }, {
        isRef: false,
        name: 'attributes',
        type: 'number',
        isArr: true
      }]);
    });
  });

  describe('swagger', () => {
    it('should generate a valid swagger response', () => {
      let swag = sampleResponse
        .status(200)
        .describe('some description')
        .prop('property', 'string')
        .ref('model', 'some model')
        .refList('models', 'some other model')
        .toSwagger();

      expect(swag).to.be.eql({
        schema: {
          description: 'some description',
          properties: {
            property: {
              type: 'string'
            },
            model: {
              $ref: '#/definitions/some model'
            },
            models: {
              type: 'array',
              items: {
                $ref: '#/definitions/some other model'
              }
            }
          }
        }
      });
    });
  });

  describe('responding', () => {
    it('should be able to generate a valid response function', () => {
      let response = sampleResponse
        .status(200)
        .prop('prop1', 'string')
        .prop('prop2', 'string')
        .getResp()({
          prop1: 'value 1',
          prop2: 'value 2',
          prop3: 'value 3'
        });
      
      expect(response).to.be.eql({
        statusCode: 200,
        response: {
          prop1: 'value 1',
          prop2: 'value 2'
        }
      });
    });
  });

  describe('generics', () => {
    let responses = Object.keys(Generics.responses);

    it('should have many responses', () => {
      expect(responses.length).to.be.greaterThan(0);
  
      responses.forEach(type => {
        let response = Generics.responses[type];
  
        if (is(Function)(response)) {
          response = response('');
        }
  
        expect(response).to.be.an.instanceof(Response);
      });
    });
  })
});