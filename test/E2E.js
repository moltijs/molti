const chai = require('chai');
chai.use(require('chai-http'));
const { resolve } = require('path');
const { readFileSync } = require('fs');
const { expect } = chai;
const app = require('./E2E/App');
const models = require('./E2E/Models');
const request = chai.request.agent(app);


describe('E2E', () => {
  before(async () => {
    await models._knex.schema.createTable('Hospitals', table => table.increments('id'));
    await models._knex.schema.createTable('Doctors', (table) => {
      table.increments('id');
      table.integer('hospitalId');
    });
    await models._knex.schema.createTable('DoctorPatients', (table) => {
      table.integer('doctorId');
      table.integer('patientId');
    });
    await models._knex.schema.createTable('Patients', table => table.increments('id'));

    return Promise.all([
      models._knex('Hospitals').insert([{id: 1}]),
      models._knex('Doctors').insert([{
        hospitalId: 1,
        id: 1
      }, {
        hospitalId: 1,
        id: 2
      }]),
      models._knex('DoctorPatients').insert([{
        doctorId: 1,
        patientId: 1
      }, {
        doctorId: 1,
        patientId: 2
      }, {
        doctorId: 2,
        patientId: 3
      }, {
        doctorId: 2,
        patientId: 4
      }]),
      models._knex('Patients').insert([{
        id: 1
      }, {
        id: 2
      }, {
        id: 3
      }, {
        id: 4
      }])
    ]);
  });
  describe('as a server', () => {
    it('should get the proper result', async () => {
      let { body } = await request.get('/hospital/1/getPatients');
  
      expect(body.records.length).to.equal(4);
    });
  });
  describe('as a swagger compliant API', () => {
    it('should have a documentation endpoint', async () => {
      let { text } = await request.get('/docs/');
  
      expect(text).to.equal(readFileSync(resolve(__dirname, '..', 'src/docs/index.html')).toString());
    });
  
    it('should have a proper swagger json', async () => {
      let { body } = await request.get('/docs/swagger.json');  
      expect(body.swagger).to.equal("2.0");
      expect(body.definitions.Hospital).to.eql(models.Hospital.toSwagger);
      expect(body.definitions.Doctor).to.eql(models.Doctor.toSwagger);
      expect(body.definitions.Patient).to.eql(models.Patient.toSwagger);
    });
  });

  describe('as a restful API', () => {
    it('should have a create endpoint', async () => {
      let { body } = await request.post('/Hospital/').send({record: {id: 2}});
      expect(body.record.id).to.equal(2);
    });

    it('should have a get all endpoint', async () => {
      let { body } = await request.get('/Hospital/');

      expect(body.records.length).to.equal(2);
      expect(body.count).to.equal(2);
    });

    it('should have a get one endpoint', async () => {
      let { body: { record } } = await request.get('/Hospital/2');

      expect(record.id).to.equal(2);
    });

    it('should have an update one endpoint', async () => {
      await request.put('/Doctor/2')
        .send({ record: { hospitalId: 2 } });
      
      let doctor = await models.Doctor.findById(2);

      expect(doctor.hospitalId).to.equal(2);
    });

    it('should have a delete endpoint', async () => {
      await request.delete('/Doctor/2');
      
      let doctor = await models.Doctor.findById(2);

      expect(doctor).to.be.null;
    });
  });

  after(() => {
    return Promise.all([
      models._knex.schema.dropTable('Hospitals'),
      models._knex.schema.dropTable('Doctors'),
      models._knex.schema.dropTable('DoctorPatients'),
      models._knex.schema.dropTable('Patients')
    ]);
  });
});