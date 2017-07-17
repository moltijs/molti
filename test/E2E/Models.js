const Registry = require('../../src/Registry');
const Schema = require('../../src/ModelSchema');
const ModelFactory = require('../../src/ModelFactory');

const hospitalSchema = new Schema({
  doctors: {
    type: Schema.Types.Models
  }
});

class Hospital extends ModelFactory(hospitalSchema) {
  getPatients() {
    return this.doctors.reduce((patients, doctor) => patients.concat(doctor.patients), []);
  }
}

const doctorSchena = new Schema({
  patients: {
    type: Schema.Types.Models,
    through: true
  }
});

const Doctor = ModelFactory(doctorSchena, { modelName: 'Doctor' });

const patientSchema = new Schema({ });

const Patient = ModelFactory(patientSchema, { modelName: 'Patient' });

module.exports = new Registry({
  client: 'sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true,
  models: [
    Hospital,
    Doctor,
    Patient
  ]
});
