let { Model } = require('../src/');
const { Schema } = require('mongoose');
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
    type: String,
    required: true
  },
  id: {
    type: Number
  }
});
let testConfig = {
  idColumn: 'id',
  validateOnInit: true
};
let testTable = 'test';

const knex = require('knex')(config);

let TestModel = Model(testTable, testSchema, testConfig);
TestModel.knex = knex;

describe('Model', () => {
  before(() => {
    return knex.schema.createTable(testTable, table => {
      table.increments(config.idColumn).primary().notNullable();
      table.string('name');
      table.dateTime('deletedAt').nullable();
    });
  });
  describe('configuration', () => {
    it('should assemble a class for a given model', () => {
      expect(TestModel.schema).to.be.eql(testSchema);
      expect(TestModel.modelName).to.be.eql(TestModel.name);
    });

    it('should have the table nane', () => {
      expect(TestModel.tableName).to.be.equal(testTable);
    });

    it('should support a default configuration (no validation on init)', () => {
      const DefaultConfigModel = Model('default', new Schema({id: Number}));
      let error;
      try {
        new DefaultConfigModel({id: 'NOT A NUMBER'});
      } catch (err) {
        error = err;
      }
      expect(error).to.be.undefined;
    });


    it('should support a JSON schemas', () => {
      let jsonSchema = {
        properties: {
          id: {
            type: 'number'
          }
        }
      };
      let config = {
        idColumn: 'id',
        validateOnInit: true
      };
      const JSONSchemaModel = Model('jsonSchema', jsonSchema, config);
      let error;
      try {
        new JSONSchemaModel({id: 'NOT A NUMBER'});
      } catch (err) {
        error = err;
      }

      expect(error[0].keyword).to.be.equal('type');
      expect(error[0].dataPath).to.be.equal('.id');
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

    it('should have a static create method', async() => {
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
    after(async () => {
      await TestModel.knex(testTable).truncate();
    });
  });

  describe('data retrieval', () => {
    before(async () => {
      await knex(testTable).insert([{
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
  
      TestModel = Model(testTable, testSchema, testConfig);
      TestModel.knex = knex;

      await TestModel.knex(testTable).insert([{
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

      expect(result.toJSON()).to.equal(JSON.stringify(result._props));
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
      let dbModel = await TestModel.knex(testTable).select('name').where('id', result.id);
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

    it('should be able to soft delete data', async () => {
      testConfig.deletedAtColumn = 'deletedAt';
      let _TestModel = TestModel;
  
      TestModel = Model(testTable, testSchema, testConfig);
      TestModel.knex = knex;

      newModel = new TestModel(newModel._props);

      await newModel.destroy();

      let dbModel = await TestModel.knex(testTable)
        .select('deletedAt')
        .where('id', newModel.id);

      expect(dbModel[0].deletedAt).to.be.below(Date.now());

      TestModel = _TestModel;
    });


    it('should be able to restore soft deleted data', async () => {
      testConfig.deletedAtColumn = 'deletedAt';
      let _TestModel = TestModel;
  
      TestModel = Model(testTable, testSchema, testConfig);
      TestModel.knex = knex;

      await TestModel.restore(newModel.id);
      let dbModel = await TestModel.knex(testTable)
        .select('deletedAt')
        .where('id', newModel.id);

      expect(dbModel[0].deletedAt).to.be.null;
      TestModel = _TestModel;
    });

    it('should be able to hard delete data', async () => {
      newModel = new TestModel(newModel._props);
      await newModel.destroy();

      let dbModel = await TestModel.knex(testTable)
        .select('*')
        .where('id', newModel.id);

      expect(dbModel).to.be.eql([]);
    });


    it('should have a static delete method', async () => {
      let newRecord = await TestModel.create(newModel._props);
      await TestModel.remove({id: newRecord.id});

      let dbModel = await TestModel.knex(testTable)
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
    return knex.schema.dropTable(testTable);
  });
});

describe('relationships', () => {
  describe('without join', () => {
    let schema1 = new Schema({
      id: Number,
      table2Id: Number
    });
    let schema2 = new Schema({
      id: Number
    });
    let table1 = Model('table1', schema1);
    let table2 = Model('table2', schema2);
    let registry = {
      table1,
      table2
    };

    table1.knex = knex;
    table1.attachToRegistry(registry);

    table2.knex = knex;
    table2.attachToRegistry(registry);

    before(async () => {
      await Promise.all([
        knex.schema.createTable('table1', table => {
          table.increments('id').primary().notNullable();
          table.integer('table2Id');
        }),
        knex.schema.createTable('table2', table => {
          table.increments('id').primary().notNullable();
        })
      ]);
      return Promise.all([
        knex('table1').insert([{
          id: 1,
          table2Id: 1
        }, {
          id: 2,
          table2Id: 1
        }]),
        knex('table2').insert([{
          id: 1
        }])
      ]);
    });

    it('should have attached the registry properly', () => {
      expect(table2.registry).to.equal(registry);
      expect(registry.table2).to.equal(table2);
      expect(table2.registry.table1).to.equal(table1);
    });

    it('should be able to retrieve a has many', async () => {
      let parent = new table2({
        id: 1
      });

      let children = await parent.pullAll('table1');

      expect(children.length).to.greaterThan(1);

      children.forEach(child => {
        expect(child.table2Id).to.be.equal(parent.id);
        expect(child).to.be.instanceof(table1);
      });
    });

    it('should be able to eagerly fetch many related records', async () => {
      table2.prototype.child = function () {
        return this.hasMany('table1');
      };

      let parent = await table2.findById(1, {
        withRelated: ['child']
      });

      expect(parent.child().length).to.be.greaterThan(0);
    });

    it('should be able to retrieve a belongs to', async () => {
      let child = new table1({
        id: 2,
        table2Id: 1
      });

      let parent = await child.pullOnly('table2');

      expect(parent.id).to.equal(child.table2Id);
      expect(parent).to.be.instanceOf(table2);
    });


    it('should be able to eagerly fetch one related record', async () => {
      table1.prototype.parent = function () {
        return this.belongsTo('table2');
      };

      let child = await table1.findById(1, {
        withRelated: ['parent']
      });

      expect(child.parent()).to.be.instanceof(table2);
    });

    after(async () => {
      await Promise.all([
        knex.schema.dropTable('table1'),
        knex.schema.dropTable('table2')
      ]);
    });
  });

  describe('with join', () => {

    let table1Schema = new Schema({id: Number});
    let table2Schema = new Schema({id: Number});

    class Table1 extends Model('table1', table1Schema) {
      table2() {
        return this.hasMany('table1', {
          through: 'table1Table2'
        });
      }
    }

    class Table2 extends Model('table2', table2Schema) {
      table1() {
        return this.hasMany('table1', {
          through: 'table1Table2'
        });
      }
    }

    let registry = {
      table1: Table1,
      table2: Table2
    };

    Table1.knex = Table2.knex = knex;
    Table1.registry = Table2.registry = registry;

    before(async () => {
      await Promise.all([
        knex.schema.createTable('table1', table => table.increments('id')),
        knex.schema.createTable('table1Table2', table => {
          table.integer('table1Id');
          table.integer('table2Id');
        }),
        knex.schema.createTable('table2', table => table.increments('id'))
      ]);

      return Promise.all([
        knex('table1').insert([{
          id: 1
        }, {
          id: 2
        }, {
          id: 3
        }]),
        knex('table2').insert([{
          id: 1
        }, {
          id: 2
        }, {
          id: 3
        }]),
        knex('table1Table2').insert([{
          table1Id: 1,
          table2Id: 1
        }, {
          table1Id: 2,
          table2Id: 1
        }, {
          table1Id: 1,
          table2Id: 2
        }, {
          table1Id: 2,
          table2Id: 2
        }, {
          table1Id: 1,
          table2Id: 3
        }])
      ]);
    });

    it('should be able to find many through a join table', async () => {
      let table1Instance = await Table1.findById(1);

      let table2Instances = await table1Instance.pullAll('table2', {
        through: 'table1Table2'
      });

      expect(table2Instances.length).to.equal(3);
    });

    it('should be able to guess the intermediate table', async () => {
      let table1Instance = await Table1.findById(1);
      let table2Instances = await table1Instance.pullAll('table2', {
        through: true
      });

      expect(table2Instances.length).to.equal(3);
    });

    it('should be able to find many through a join table eagerly', async () => {
      let [table1Instance1, table1Instance2, table1Instance3] = await Table1.find({}, {
        withRelated: ['table2']
      });

      expect(table1Instance1.table2().length).to.equal(3);
      expect(table1Instance2.table2().length).to.equal(2);
      expect(table1Instance3.table2().length).to.equal(0);
    });

    after(() => {
      return Promise.all([
        knex.schema.dropTable('table1'),
        knex.schema.dropTable('table1Table2'),
        knex.schema.dropTable('table2')
      ]);
    });
  });

  describe('with depth', () => {
    let table1Schema = new Schema({
      id: Number
    });
    let table2Schema = new Schema({
      id: Number,
      table1Id: Number
    });
    let table3Schema = new Schema({
      id: Number,
      table2Id: Number,
      table4Id: Number
    });
    let table4Schema = new Schema ({
      id: Number
    });

    class Table1 extends Model('table1', table1Schema) {
      table2 () {
        return this.hasMany('table2');
      }
    }

    class Table2 extends Model('table2', table2Schema) {
      table1 () {
        return this.belongsTo('table1');
      }
      table3 () {
        return this.hasMany('table3');
      }
    }
    
    class Table3 extends Model('table3', table3Schema) {
      table2 () {
        return this.belongsTo('table2');
      }

      table4 () {
        return this.belongsTo('table4');
      }
    }

    const Table4 = Model('table4', table4Schema);

    let registry = {
      table1: Table1,
      table2: Table2,
      table3: Table3,
      table4: Table4
    };

    Table1.registry = Table2.registry = Table3.registry = Table4.registry = registry;
    Table1.knex = Table2.knex = Table3.knex = Table4.knex = knex;

    before(async () => {
      await Promise.all([
        knex.schema.createTable('table1', table => table.increments('id')),
        knex.schema.createTable('table2', (table) => {
          table.increments('id');
          table.integer('table1Id');
        }),
        knex.schema.createTable('table3', (table) => {
          table.increments('id');
          table.integer('table2Id');
          table.integer('table4Id');
        }),
        knex.schema.createTable('table4', table => table.increments('id'))
      ]);

      return Promise.all([
        knex('table1').insert([{
          id: 1
        }]),
        knex('table2').insert([{
          id: 1,
          table1Id: 1
        }, {
          id: 2,
          table1Id: 1
        }]),
        knex('table3').insert([{
          id: 1,
          table2Id: 1,
          table4Id: 1
        }, {
          id: 2,
          table2Id: 1,
          table4Id: 2
        }, {
          id: 3,
          table2Id: 2,
          table4Id: 1
        }, {
          id: 4,
          table2Id: 2,
          table4Id: 2
        }]),
        knex('table4').insert([{
          id: 1
        }, {
          id: 2
        }])
      ]);
    });

    it('should be able fetch three layers deep', async () => {
      let table1Instance = await Table1.findById(1, {
        withRelated: ['table2.table3.table4']
      });
      
      expect(table1Instance).to.be.instanceOf(Table1);

      const table2Instances = table1Instance.table2();
      expect(table2Instances.length).to.equal(2);

      table2Instances.forEach(table2Instance => {
        table2Instance;
        expect(table2Instance).to.be.instanceof(Table2);
        expect(table2Instance.table3().length).to.equal(2);
        table2Instance.table3().forEach(table3Instance => {
          expect(table3Instance).to.be.instanceof(Table3);

          let expectedTable4Id = table3Instance.id % 2 === 0 ? 2 : 1;

          expect(table3Instance.table4()).to.be.instanceof(Table4);
          expect(table3Instance.table4().id).to.equal(expectedTable4Id);
        });
      });
    });
  });
});