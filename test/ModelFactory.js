let { Model } = require('../src/');
const { Schema } = require('../src/');
const { expect } = require('chai');

let config = {
  client: 'sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true
};
let testSchema = new Schema({
  name: {
    type: Schema.Types.String,
    required: true
  },
  id: {
    type: Schema.Types.Number
  }
});
let tableName = 'test';
let testConfig = {
  idColumn: 'id',
  validateOnInit: true,
  tableName,
  modelName: 'TestModel'
};

const knex = require('knex')(config);

let TestModel = Model(testSchema, testConfig);
TestModel.knex = knex;

describe('Model', () => {
  before(() => {
    return knex.schema.createTable(tableName, table => {
      table.increments(config.idColumn).primary().notNullable();
      table.string('name');
      table.dateTime('deletedAt').nullable();
      table.dateTime('created_at').nullable();
      table.dateTime('updated_at').nullable();

      table.dateTime('createdAt').nullable();
      table.dateTime('updatedAt').nullable();
    });
  });
  describe('configuration', () => {
    it('should be able to attach to an existing registry', () => {
      let registry = {};
      TestModel.attachToRegistry(registry);

      expect(TestModel.registry).to.equal(registry);
      expect(registry.TestModel).to.equal(TestModel);
    });

    it('should assemble a class for a given model', () => {
      expect(TestModel.schema).to.be.eql(testSchema);
      expect(TestModel.modelName).to.be.eql('TestModel');
    });

    it('should have the table nane', () => {
      expect(TestModel.tableName).to.be.equal(tableName);
    });

    it('should support a default configuration (no validation on init)', () => {
      const DefaultConfigModel = Model(new Schema({
        id: {
          type: Schema.Types.Number
        }
      }), {tableName});
      let error;
      try {
        new DefaultConfigModel({id: 'NOT A NUMBER'});
      } catch (err) {
        error = err;
      }
      expect(error).to.be.undefined;
    });
  });
  describe('validation', () => {

    it('should be able to fail model validation (missing value)', () => {
      let error;
      try {
        new TestModel({});
      } catch (err) {
        error = err;
      }

      expect(error[0].keyword).to.be.equal('required');
      expect(error[0].message).to.contain('name');
    });

    it('should be able to fail model validation (wrong type)', () => {
      let error;
      try {
        new TestModel({
          name: 'Test',
          id: 'NOT A NUMBER'
        });
      } catch (err) {
        error = err;
      }

      expect(error[0].keyword).to.be.equal('type');
      expect(error[0].dataPath).to.contain('id');
    });

    it('should be able to pass model validation', () => {
      let model = new TestModel({
        name: 'Test'
      });

      expect(model.name).to.be.equal('Test');
      expect(model._persisted).to.be.false;
    });


    it('should be able to fail model validation (post init)', () => {
      let model = new TestModel({
        name: 'Test'
      });

      delete model.name;

      expect(model.validate()).to.be.equal(false);
      expect(model.errors[0].keyword).to.be.equal('required');
    });

    it('should be able to track changes', () => {
      let model = new TestModel({
        name: 'Test'
      });
      
      expect(model.changes).to.be.eql({});

      model.name = 'Changed';

      expect(model.changes.name).to.eql(model.name);
    });

    it('should be able to reset changes', () => {
      let model = new TestModel({
        name: 'Test'
      });

      model.name = 'Changed';

      model.reset();

      expect(model.name).to.equal('Test');
      expect(model.changes).to.eql({});
    });
  });

  describe('data creation', () => {
    it('should be able to insert data', async () => {
      let newModel = new TestModel({
        name: 'name'
      });
      let saveResult = await newModel.save();
      expect(saveResult).to.be.equal(newModel);
      expect(saveResult.id).to.be.greaterThan(0);
    });

    it('should have a static create method', async () => {
      let result = await TestModel.create({
        name: 'name'
      });

      expect(result.name).to.equal('name');

      let dbResult = await TestModel.findById(result.id);

      expect(dbResult.id).to.equal(result.id);
    });

    it('should support model validation', async () => {
      let newModel = new TestModel({
        name: 'name'
      });
      let error;

      delete newModel.name;
      try {
        await newModel.save({validate: true});
      } catch(err) {
        error = err;
      }

      expect(error[0].keyword).to.be.equal('required');
      expect(error[0].message).to.contain('name');
    });

    it('should support a custom created at timestamp', async () => {
      let TestModel = Model(testSchema, Object.assign({ timestamps: true, createdAtColumn: 'created_at', updatedAtColumn: 'updated_at' }, testConfig));
      TestModel.knex = knex;

      let result = await TestModel.create({
        name: 'testing created at'
      });


      expect(result.created_at.getTime()).to.be.greaterThan(0);
      expect(result.created_at.getTime()).not.to.be.greaterThan(Date.now());
    });

    after(async () => {
      await TestModel.knex(tableName).truncate();
    });
  });

  describe('data retrieval', () => {
    before(async () => {
      await knex(tableName).insert([{
        id: 1,
        name: 'test1'
      }, {
        id: 2,
        name: 'test2'
      }]);
    });

    it('should be able to find by id', async () => {
      let foundModel = await TestModel.findById(1);

      expect(foundModel.name).to.be.equal('test1');
      expect(foundModel).to.be.instanceOf(TestModel);
      expect(foundModel._persisted).to.be.true;
    });

    it('should return null if no model is found', async () => {
      let foundModel = await TestModel.findById('not found');

      expect(foundModel).to.be.null;
    });

    it('should be able to multiple', async () => {
      let results = await TestModel.find();

      results.forEach(model => {
        expect(model).to.be.instanceOf(TestModel);
        expect(model._persisted).to.be.true;
      });
    });

    it('should be able to query via function call', async () => {
      let results = await TestModel.find(query => {
        query.where('id', '>', 1);
      });
      
      results.forEach(model => {
        expect(model.id).to.be.greaterThan(1);
        expect(model).to.be.instanceOf(TestModel);
        expect(model._persisted).to.be.true;
      });
    });


    it('should be able to query via query object', async () => {
      let results = await TestModel.find({id: 1});

      results.forEach(model => {
        expect(model.id).to.be.equal(1);
        expect(model).to.be.instanceOf(TestModel);
        expect(model._persisted).to.be.true;
      });
    });


    it('should be able to query via query object', async () => {
      let results = await TestModel.find({id: 1});

      results.forEach(model => {
        expect(model.id).to.be.equal(1);
        expect(model).to.be.instanceOf(TestModel);
        expect(model._persisted).to.be.true;
      });
    });

    it('should return an empty array if no results', async () => {
      let results = await TestModel.find(query => {
        query.where('id', '<', 1);
      });
      
      expect(results).to.be.eql([]);
    });

    it('should support soft deleted rows', async () => {
      testConfig.deletedAtColumn = 'deletedAt';
      let _TestModel = TestModel;
  
      TestModel = Model(testSchema, testConfig);
      TestModel.knex = knex;

      await TestModel.knex(tableName).insert([{
        name: 'deleted row',
        deletedAt: new Date()
      }]);

      let results = await TestModel.find(query => {
        query.where('name', 'deleted row');
      });
      
      expect(results).to.be.eql([]);
      TestModel = _TestModel;
    });

    it('should support serialization', async () => {
      let [result] = await TestModel.find({});

      expect(JSON.parse(JSON.stringify(result))).to.eql(result._props);
    });
  });
  describe('updating data', () => {
    let newModel;
    before(() => {
      newModel = new TestModel({
        name: 'name'
      });

      return newModel.save();
    });

    
    it('should be able to update data', async () => {
      newModel.name = 'new_name';

      let result = await newModel.save();
      expect(result).to.be.equal(newModel);
      let dbModel = await TestModel.knex(tableName).select('name').where('id', result.id);
      expect(dbModel[0].name).to.be.equal(result.name);
    });

    it('should have a static method for updating data', async () => {
      let name = 'some other new name';
      await TestModel.update({ id: newModel.id }, { name });
      let updatedResult = await TestModel.findById(newModel.id);
      expect(updatedResult.name).to.equal(name);
    });

    it('should support a function for an update query', async () => {
      let name = 'some other new name';
      await TestModel.update(q => q.where('id', newModel.id), { name });
      let updatedResult = await TestModel.findById(newModel.id);
      expect(updatedResult.name).to.equal(name);
    });
    
    it('should support default timestamps', async () => {
      let TestModel = Model(testSchema, Object.assign({ timestamps: true }, testConfig));
      TestModel.knex = knex;

      let result = await TestModel.create({
        name: 'testing created at'
      });

      result.name = 'testing updated at';

      await result.save();

      expect(result.updatedAt.getTime()).not.to.be.lessThan(result.createdAt.getTime());
    });

    it('should support a custom updated at timestamp', async () => {
      let TestModel = Model(testSchema, Object.assign({ timestamps: true, createdAtColumn: 'created_at', updatedAtColumn: 'updated_at' }, testConfig));
      TestModel.knex = knex;

      let result = await TestModel.create({
        name: 'testing created at'
      });

      result.name = 'testing updated at';

      await result.save();

      expect(result.updated_at.getTime()).not.to.be.lessThan(result.created_at.getTime());
    });

    it('should be able to soft delete data', async () => {
      testConfig.deletedAtColumn = 'deletedAt';
      let _TestModel = TestModel;
  
      TestModel = Model(testSchema, testConfig);
      TestModel.knex = knex;

      newModel = new TestModel(newModel._props);

      await newModel.destroy();

      let dbModel = await TestModel.knex(tableName)
        .select('deletedAt')
        .where('id', newModel.id);

      expect(dbModel[0].deletedAt).not.to.be.above(Date.now());

      TestModel = _TestModel;
    });


    it('should be able to restore soft deleted data', async () => {
      testConfig.deletedAtColumn = 'deletedAt';
      let _TestModel = TestModel;
  
      TestModel = Model(testSchema, testConfig);
      TestModel.knex = knex;

      await TestModel.restore(newModel.id);
      let dbModel = await TestModel.knex(tableName)
        .select('deletedAt')
        .where('id', newModel.id);

      expect(dbModel[0].deletedAt).to.be.null;
      TestModel = _TestModel;
    });

    it('should be able to hard delete data', async () => {
      let _TestModel = TestModel;
      delete testConfig.deletedAtColumn;
  
      TestModel = Model(testSchema, testConfig);
      TestModel.knex = knex;

      newModel = new TestModel(newModel._props);
      await newModel.destroy();

      let dbModel = await TestModel.knex(tableName)
        .select('*')
        .where('id', newModel.id);

      expect(dbModel).to.be.eql([]);

      TestModel = _TestModel;
    });


    it('should have a static delete method', async () => {
      let newRecord = await TestModel.create(newModel._props);
      await TestModel.remove({id: newRecord.id});

      let dbModel = await TestModel.knex(tableName)
        .select('*')
        .where('id', newRecord.id);

      expect(dbModel).to.be.eql([]);
    });

    it('should block restores on hard delete models', async () => {
      let error;

      try {
        await TestModel.restore('some id');
      } catch(err) {
        error = err;
      }

      expect(error.message).to.contain('does not support soft deletes');
    });
  });


  after(() => {
    return knex.schema.dropTable(tableName);
  });
});
