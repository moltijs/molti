const Response = require('./Response');
const Parameter = require('./Parameter');

module.exports = {
  params: {
    get id () {
      return new Parameter('id')
        .path()
        .number();
    },
    get guid () {
      return new Parameter('guid')
        .path()
        .string();
    },
    get q () {
      return new Parameter('q')
        .query()
        .string();
    },
    get query () {
      return new Parameter('query')
        .query()
        .string();
    },
    get limit () {
      return new Parameter('limit')
        .query()
        .number();
    },
    get skip () {
      return new Parameter('skip')
        .query()
        .number();
    },
    get record () {
      return new Parameter('record')
        .body()
        .require();
    },
    get related () {
      return new Parameter('related')
        .query()
        .string();
    }
  },
  responses: {
    get success () {
      return new Response(200)
        .name('success')
        .prop('message', 'string');
    },
  
    get found () {
      return new Response(200)
        .name('found')
        .prop('record', 'object');
    },
  
    foundModel (modelName) {
      return new Response(200)
        .name('found')
        .ref('record', modelName);
    },
  
    get foundList () {
      return new Response(200)
        .name('foundList')
        .propList('records', 'object');
    },
  
    foundModelList (modelName) {
      return new Response(200)
        .name('foundList')
        .refList('records', modelName);
    },
  
    get created () {
      return new Response(201)
        .name('created')
        .prop('record', 'object');
    },
  
    createdModel (modelName) {
      return new Response(201)
        .name('created')
        .ref('record', modelName);
    },

    get noContent () {
      return new Response(204)
        .name('noContent');
    },
  
    get badRequest () {
      return new Response(400)
        .name('badRequest')
        .prop('message', 'string');
    },
  
    get unauthorized () {
      return new Response(401)
        .name('unauthorized')
        .prop('message', 'string');
    },
  
    get forbidden () {
      return new Response(403)
        .name('forbidden')
        .prop('message', 'string');
    },
  
    get notFound () {
      return new Response(404)
        .name('notFound')
        .prop('message', 'string');
    },
  
    get internalError () {
      return new Response(500)
        .name('internalError')
        .prop('message', 'string')
        .prop('stack', 'string');
    }
  }
};