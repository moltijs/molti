const Schema = require('../src/ModelSchema');
const { expect } = require('chai');

describe('Schema Constructor', () => {
  it('should instantiate', () => {
    const newSchema = new Schema({});
    expect(newSchema._original).to.eql({});
  });

  it('should block entities with a missing type', () => {
    let err;
    try {
      new Schema({
        attr1: {}
      });
    } catch(e) {
      err = e;
    }

    expect(err.message).to.contain('No type specified');
  });

  it('should block unknown schema types', () => {
    let err;
    try {
      new Schema({
        attr1: {
          type: 'INVALID TYPE'
        }
      });
    } catch(e) {
      err = e;
    }

    expect(err.message).to.contain('Unknown type');
    expect(err.message).to.contain('INVALID TYPE');
  });

  it('should fail if no configuration is passed', () => {
    let err;
    try {
      new Schema();
    } catch(e) {
      err = e;
    }

    expect(err).not.to.be.undefined;
  });

  it('should handle an explicitly undefined iterable property as a non-property', () => {
    let err;
    try {
      new Schema({
        id: undefined
      });
    } catch(e) {
      err = e;
    }

    expect(err).to.be.undefined;
  });

  it('should not add keys with undefined values to the formatted dictionary', () => {
    const s = new Schema({ id: undefined });

    const keys = Object.keys(s._formatted);

    expect(keys.indexOf('id')).to.eq(-1);
  });
});

describe('Schema Types', () => {
  it('should have string support', () => {
    let config = {
      type: 'string',
      enum: [''],
      format: '',
      maxLength: '',
      minLength: '',
      pattern: undefined
    };
    expect(Schema._primitives.String(config)).to.eql(config);
  });

  it('should have string pattern support', () => {
    expect(Schema._primitives.String({
      pattern: /test/,
    }).pattern).to.eql('/test/');
  });

  it('should have number support', () => {
    let config = {
      type: 'number',
      multipleOf: 0,
      minimum: 0,
      maximum: 0,
      exclusiveMaximum: 0,
      exclusiveMinimum: 0
    };
    expect(Schema._primitives.Number(config)).to.eql(config);
  });

  it('should have JSON support', () => {
    expect(Schema._primitives.JSON({})).to.eql({});
  });

  it('should have have date support', () => {
    expect(Schema._primitives.Date()).to.eql({
      type: 'string',
      format: 'date-time'
    });
  });

  it('should have boolean support', () => {
    expect(Schema._primitives.Boolean()).to.eql({type: 'boolean'});
  });

  it('should support casting', () => {
    let schema = new Schema({
      num: {
        type: Schema.Types.Number
      },
      str: {
        type: Schema.Types.String
      },
      bool: {
        type: Schema.Types.Boolean
      },
      date: {
        type: Schema.Types.Date
      },
      json: {
        type: Schema.Types.JSON
      },
      toJsonJson: {
        type: Schema.Types.JSON
      }
    });

    let result = schema.castInput({
      num: '1',
      str: 1,
      bool: 0,
      date: Date.now(),
      json: {},
      toJsonJson: {
        toJSON(){
          return {
            success: true
          };
        }
      }
    });

    expect(result.num).to.equal(1);
    expect(result.str).to.equal('1');
    expect(result.bool).to.be.false;
    expect(result.date).to.be.an.instanceOf(Date);
    expect(result.json).to.eql({});
    expect(result.toJsonJson).to.eql({
      success: true
    });
  });

  it('should ignore models and attributes not on schema', () => {
    let schema = new Schema({
      relatedModel: {
        type: Schema.Types.Model
      }
    });

    expect(schema.castInput({
      relatedModel: {},
      someOtherAttr: ''
    })).to.eql({});


  });

  it('should prevent changing the type', () => {
    let schema = new Schema({
      num: {
        type: Schema.Types.Number
      }
    });

    let result = schema.castInput({
      num: 1
    });

    result.num = '1';

    expect(result.num).to.equal(1);
  });
});
