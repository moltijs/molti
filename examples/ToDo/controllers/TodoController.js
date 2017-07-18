const { Controller, Generics: { responses, params } } = require('molti');

new Controller({
  responses: [responses.success]
});