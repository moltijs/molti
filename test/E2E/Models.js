const Registry = require('../../src/Registry');
const Schema = require('../../src/ModelSchema');
const ModelFactory = require('../../src/ModelFactory');

const hospitalSchema = new Schema({
  doctors: {
    type: Schema.Types.Models,
    description: '',
    default: ''
  }
});

class Hospital extends ModelFactory(hospitalSchema, { autoRestEnabled: true }) {
  getPatients() {
    return this.doctors.reduce((patients, doctor) => patients.concat(doctor.patients), []);
  }
}

const doctorSchena = new Schema({
  patients: {
    type: Schema.Types.Models,
    through: true,
    description: '',
    default: ''
  }
});

const Doctor = ModelFactory(doctorSchena, { modelName: 'Doctor', autoRestEnabled: true  });

const patientSchema = new Schema({ });

const Patient = ModelFactory(patientSchema, { modelName: 'Patient', autoRestEnabled: true });

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
