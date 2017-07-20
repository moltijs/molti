const Handler = require('./Handler');
const Controller = require('./Controller');

module.exports = (model) => {
  if (!model.autoRestEnabled) return;

  const { params, responses } = require('./Generics');

  let createHandler = new Handler({
    method: 'post',
    path: '/',
    description: `Inserts a ${model.modelName}`,
    params: [
      params.record.describe(`${model.modelName} to be created`)
    ],
    responses: [
      responses.createdModel(model.modelName),
      responses.badRequest.describe(`${model.modelName} to be inserted is invalid`)
    ],

    async handler({ record }, { created, badRequest }) {
      let createdRecord = await model.create(record);
      return created({
        record: await createdRecord
      });
    }
  });

  let getAllHandler = new Handler({
    method: 'get',
    path: '/',
    description: 'Queries a model using the query parameter and returns a page of results with the count',
    params: [
      params.qParam.describe('JSON representation of a filter'),
      params.limitParam.describe('Max records in response'),
      params.skipParam.describe('Row to start from'),
      params.relatedParam.describe('Related records to pull in')
    ],
    responses: [
      responses.foundModelList(model.modelName).prop('count', 'number').describe(`List of ${model.modelName} with total count of all records that match query`),
      responses.badRequest
    ],

    async handler({ query='{}', limit, start=0, related }, { foundList, badRequest }) {
      try {
        query = JSON.parse(query);
      } catch(err) {
        return badRequest(`Invalid query input`);
      }

      let [records, [{'count(*)': count}]] = await Promise.all([
        model.find((q) => {
          q.where(query).offset(start);
          if (limit) {
            q.limit(limit);
          }
        }, {
          withRelated: related ? [related.split(',')] : undefined
        }),
        model.find((q) => {
          q.where(query).count();
        })
      ]);
      return foundList({
        records,
        count
      });
    }
  });

  let getOneHandler = new Handler({
    method: 'get',
    path: '/:id',
    description: `Finds a specific ${model.modelName} using the primary key`,
    params: [
      params.idParam,
      params.relatedParam
    ],
    responses: [
      responses.foundModel(model.modelName)
    ],

    async handler({ id, related }, { found }) {
      let record = await model.findById(id, {
        withRelated: related ? [related.split(',')] : undefined
      });

      return found({
        record
      });
    }
  });

  let updateHandler = new Handler({
    method: 'put',
    path: '/:id',
    description: `Finds and replaces an existing record with the ${model.modelName} in the body`,
    params: [
      params.idParam,
      params.record.describe('Record to update')
    ],
    responses: [
      responses.success
    ],

    async handler({ id, record }, { success }) {
      await model.update({ [model.idColumn]: id }, record);

      return success({
        message: `Successfully updated`
      });
    }
  });

  let deleteHandler = new Handler({
    method: 'delete',
    path: '/:id',
    description: `Finds and removes an existing ${model.modelName} by id`,
    params: [
      params.idParam
    ],
    responses: [
      responses.success
    ],

    async handler({ id }, { success }) {
      await model.remove({ [model.idColumn]: id });
      return success({
        message: `${model} with id ${id} has been removed`
      });
    }
  });

  const crudController = new Controller({
    basePath: `/${model.modelName}`,
    tag: [model.modelName],
    handlers: [
      createHandler,
      getAllHandler,
      getOneHandler,
      updateHandler,
      deleteHandler
    ],
    description: 'Provides administrative CRUD functionality'
  });

  return model.controller  = crudController;
};