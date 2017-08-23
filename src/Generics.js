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
    },
    get username () {
      return new Parameter('username')
        .body()
        .string();
    },
    get password () {
      return new Parameter('password')
        .body()
        .string();
    }
  },
  responses: {
    get accepted () {
      return new Response(202)
        .alias('accepted')
        .prop('message', 'string');
    },
    get success () {
      return new Response(200)
        .alias('success')
        .prop('message', 'string');
    },
  
    get found () {
      return new Response(200)
        .alias('found')
        .prop('record', 'object');
    },
  
    foundModel (modelName) {
      return new Response(200)
        .alias('found')
        .ref('record', modelName);
    },
  
    get foundList () {
      return new Response(200)
        .alias('foundList')
        .propList('records', 'object');
    },
  
    foundModelList (modelName) {
      return new Response(200)
        .alias('foundList')
        .refList('records', modelName);
    },
  
    get created () {
      return new Response(201)
        .alias('created')
        .prop('record', 'object');
    },
  
    createdModel (modelName) {
      return new Response(201)
        .alias('created')
        .ref('record', modelName);
    },

    get noContent () {
      return new Response(204)
        .alias('noContent');
    },
  
    get badRequest () {
      return new Response(400)
        .alias('badRequest')
        .prop('message', 'string');
    },
  
    get unauthorized () {
      return new Response(401)
        .alias('unauthorized')
        .prop('message', 'string');
    },
  
    get forbidden () {
      return new Response(403)
        .alias('forbidden')
        .prop('message', 'string');
    },
  
    get notFound () {
      return new Response(404)
        .alias('notFound')
        .prop('message', 'string');
    },
  
    get internalError () {
      return new Response(500)
        .alias('internalError')
        .prop('message', 'string')
        .prop('stack', 'string');
    }
  }
};