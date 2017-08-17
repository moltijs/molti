const Parameter = require('../src/Parameter');
const { expect } = require('chai');

let mockRequest = {
  query: {
    name: 'value'
  },
  body: {
    name: 'value'
  },
  get() {
    return 'value';
  },
  params: {
    name: 'value'
  }
};

describe('Parameter', () => {
  let sampleParam = new Parameter();
  beforeEach(() => {
    sampleParam = new Parameter();
  });
  it('should check for validity (failure)', () => {
    expect(sampleParam.valid).to.be.false;
  });

  it('should check for validity (success)', () => {
    sampleParam = new Parameter('Name', 'body', 'test', false, 'string', false);

    expect(sampleParam.valid).to.be.true;
  });

  describe('name', () => {
    it('should set param names', () => {
      sampleParam.param('sample');

      expect(sampleParam.param()).to.be.equal('sample');
    });

  });

  describe('locations', () => {
    it('should set location', () => {
      sampleParam.location('some location');

      expect(sampleParam.location()).to.be.equal('some location');
    });

    it('should have helpers', () => {
      [
        'body',
        'headers',
        'path',
        'query'
      ].forEach(helper => {
        let param = new Parameter();
        param[helper]();
        expect(param._location).to.be.equal(helper);
      });
    });

    it('should support multiple locations', () => {
      sampleParam.body().headers();
      expect(sampleParam.location()).to.be.equal('body|headers');
    });
  });

  describe('types', () => {
    it('should set type', () => {
      sampleParam.type('some type');
      expect(sampleParam.type()).to.be.equal('some type');
    });

    it('should have helpers', () => {
      [
        'any',
        'number',
        'string',
        'boolean'
      ].forEach(helper => {
        let param = new Parameter();
        param[helper]();
        expect(param.type()).to.be.equal(helper);
      });
    });

    it('should support multiple types', () => {
      sampleParam.string().boolean();
      expect(sampleParam.type()).to.be.equal('string|boolean');
    });
  });

  describe('others', () => {
    it('should support being required', () => {
      expect(sampleParam._required).to.be.false;
      sampleParam.require();
      expect(sampleParam._required).to.be.true;
    });

    it('should support being described', () => {
      expect(sampleParam._description).to.be.equal('');
      sampleParam.describe('description');
      expect(sampleParam._description).to.be.equal('description');
    });

    it('should support being nullable', () => {
      expect(sampleParam._allowNull).to.be.false;
      sampleParam.allowNull();
      expect(sampleParam._allowNull).to.be.true;
    });

    it('should support enumerable values', () => {
      sampleParam.enum([1, 2, 3, 4]);
      expect(sampleParam._values).to.eql([1, 2, 3, 4]);
    });
  });
  describe('swagger', () => {
    it('should be able to generate swag', () => {
      sampleParam = new Parameter()
        .param('name')
        .body()
        .require()
        .string()
        .describe('described');
      
      expect(sampleParam.toSwagger()).to.eql({
        name: 'name',
        in: 'body',
        required: true,
        type: 'string',
        description: 'described'
      });
    });

    it('should support enum types', () => {
      sampleParam = new Parameter('color')
        .string()
        .path()
        .enum(['blue', 'green']);

      expect(sampleParam.toSwagger()).to.eql({
        name: 'color',
        in: 'path',
        type: 'string',
        enum: ['blue', 'green'],
        required: false,
        description: ''
      });
    });

    it('should support references', () => {
      sampleParam = new Parameter('color')
        .path()
        .references('SomeModel');

      expect(sampleParam.toSwagger()).to.eql({
        name: 'color',
        in: 'path',
        type: 'object',
        schema: {
          $ref: '#/definitions/SomeModel'
        },
        required: false,
        description: ''
      });
    });

    it('should support the any type', () => {
      sampleParam.any();

      expect(sampleParam.toSwagger().type).to.be.eql('object');
    });
  });

  describe('request handling', () => {
    it('should be able to extract the value from a request body', () => {
      sampleParam.param('name').body();
      expect(sampleParam.getValFromRequest(mockRequest)).to.be.equal('value');
    });

    it('should be able to extract the value from a request query', () => {
      sampleParam.param('name').query();
      expect(sampleParam.getValFromRequest(mockRequest)).to.be.equal('value');
    });

    it('should be able to extract the value from a request header', () => {
      sampleParam.param('name').headers();
      expect(sampleParam.getValFromRequest(mockRequest)).to.be.equal('value');
    });

    it('should be able to extract the value from a request path', () => {
      sampleParam.param('name').path();
      expect(sampleParam.getValFromRequest(mockRequest)).to.be.equal('value');
    });

    it('should tell if a value exists on a request', () => {
      sampleParam.param('name').path();
      expect(sampleParam.validateExists(mockRequest)).to.be.true;
    });

    it('should tell if a value does not exist on a request', () => {
      sampleParam.param('invalid').path();
      expect(sampleParam.validateExists(mockRequest)).to.be.false;
    });

    it('should be able to attach a returned value', () => {
      let request = {};
      sampleParam.param('name');
      sampleParam.applyToRequest(request, 'value');
      expect(request).to.be.eql({name: 'value'});
    });

    it('should support valid enum data types', () => {
      let request = {
        query: {
          value: 1
        }
      };

      sampleParam = new Parameter('value').query().enum([1, 2]);

      expect(sampleParam.validateExists(request)).to.be.true;
    });

    it('should support invalid enum data types', () => {
      let request = {
        query: {
          value: 4
        }
      };

      sampleParam = new Parameter('value').query().enum([1, 2]);

      expect(sampleParam.validateRequest(request, {}).valid).to.be.false;
    });
  });
  describe('data validation', () => {
    it('should handle numbers', () => {
      expect(sampleParam.handleNumber('5')).to.be.equal(5);
      expect(sampleParam.handleNumber('invalid number')).to.be.undefined;
    });

    it('should handle booleans', () => {
      expect(sampleParam.handleBoolean('true')).to.be.true;
      expect(sampleParam.handleBoolean('false')).to.be.false;
      expect(sampleParam.handleBoolean('invalid boolean')).to.be.undefined;
    });

    it('should handle strings', () => {
      expect(sampleParam.handleString('true')).to.be.equal('true');
      expect(sampleParam.handleString(false)).to.be.undefined;
    });
  });
  describe('request validation', () => {
    let mockRequest = {
      body: {
        value1: '1',
        value2: 'two',
        value3: 'false'
      },
      query: {}
    };
    it('should validate a request', () => {
      let parameters = [
        new Parameter('value1').number().body(),
        new Parameter('value2').string().body(),
        new Parameter('value3').boolean().body()
      ];
      let params = {};
      parameters.forEach(param => {
        expect(param.validateRequest(mockRequest, params).valid).to.be.true;
      });
      expect(params.value1).to.be.equal(1);
      expect(params.value2).to.be.equal('two');
      expect(params.value3).to.be.false;
    });

    it('should invalidate a request', () => {
      sampleParam.param('does not exist').query().require();
      expect(sampleParam.validateRequest(mockRequest, {}).valid).to.be.false;
    });

    it('should not invalidate a non-required parameter', () => {
      sampleParam.param('does not exist').query();
      expect(sampleParam.validateRequest(mockRequest, {}).valid).to.be.true;
    });


    it('should invalidate an invalid parameter type', () => {
      sampleParam.param('value2').body().number();
      expect(sampleParam.validateRequest(mockRequest, {}).valid).to.be.false;
    });
  });
});