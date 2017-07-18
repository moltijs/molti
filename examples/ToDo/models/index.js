const { Registry } = require('molti');

module.exports = new Registry({
  client: 'sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true,
  models: [
    require('./Todo')
  ]
});
