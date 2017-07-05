const { ModelLoader } = require('../src/');
const { expect } = require('chai');
const Knex = require('knex');

let config = {
  client: 'sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true
};

let loader;
let dbTable = 'dbs';

let sampleDbs = [{
  id: 1,
  connection: 'file::memory:',
  tenant: 'tenant_1',
  client: 'sqlite'
}, {
  id: 2,
  connection: 'file::memory:',
  client: 'sqlite',
  tenant: 'tenant_2'
}];

let sampleClasses = [
  class classA {
    static get knex() {
      return false;
    }
  },
  class classB {
    static shouldRemainHere() {
      return true;
    }
  }
];

describe('ModelLoader', () => {
  before(async () => {
    loader = new ModelLoader(config);
    loader.models = sampleClasses;

    await loader.origin.schema.createTable(dbTable, table => {
      table.increments('id').primary().notNullable();
      table.string('connection').notNullable();
      table.string('client').notNullable();
      table.string('tenant').notNullable();
    });
    await loader.origin(dbTable).insert(sampleDbs);
    await loader.pullTenants(dbTable);
  });

  it('should have attached a knex instance to each row', () => {
    loader.dbs.forEach((db, index) => {
      expect(db.knex.prototype).to.be.eql(Knex.prototype);
      sampleDbs[index].knex = db.knex;
    });
  });

  it('should have loaded the appropriate tenants', () => {
    expect(loader.dbs).to.be.eql(sampleDbs);
  });

  it('should be able to create an instance of each class for each db', () => {
    let mappedModels = loader.attachModels();
    expect(mappedModels).to.be.eql(loader.mappedModels);

    expect(mappedModels.tenant_1.classA.knex).not.to.be.false;
    expect(mappedModels.tenant_1.classA.knex).not.to.be.undefined;
  });

  it('should not have matching models across tenants', () => {
    expect(loader.mappedModels.tenant_1.classA).not.to.be.eql(loader.mappedModels.tenant_2.classA);
    expect(loader.mappedModels.tenant_1.classB).not.to.be.eql(loader.mappedModels.tenant_2.classB);
  });

  it('should preserve methods from classes', () => {
    expect(loader.mappedModels.tenant_1.classB.shouldRemainHere()).to.be.eql(loader.mappedModels.tenant_2.classB.shouldRemainHere());
  });

  it('should be able to use the helper via an attribute', () => {
    let sampleRequest = {
      someAttribute: 'tenant_1'
    };
    let binding = {};

    let helper = loader.helper('someAttribute');
    helper.bind(binding)(sampleRequest);
    expect(loader.mappedModels.tenant_1).to.equal(binding.models);
  });

  it('should be able to use the helper via a function call', () => {
    let sampleRequest = {
      someAttribute: 'tenant_1'
    };
    let binding = {};
    let helper = loader.helper(req => req['someAttribute']);
    helper.bind(binding)(sampleRequest);
    expect(loader.mappedModels.tenant_1).to.equal(binding.models);
  });
});
