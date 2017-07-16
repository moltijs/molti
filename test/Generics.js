const { Generics, Parameter, Response } = require('../src/');
const { expect } = require('chai');
const { is } = require('ramda');

describe('generics', () => {
  let responses = Object.keys(Generics.responses);
  let params = Object.keys(Generics.params);

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


  it('should have many parameters', () => {
    expect(params.length).to.be.greaterThan(0);

    params.forEach(type => {
      let param = Generics.params[type];

      if (is(Function)(param)) {
        param = param('');
      }

      expect(param).to.be.an.instanceof(Parameter);
    });
  });
});