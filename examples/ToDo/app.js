const { Application } = require('molti');

const toDoController = require('./controllers/TodoController');

const app = new Application({
  name: 'To Do Application',
  description: 'Used to manage your entire life',
  version: '1.0.0',
  controllers: [
    toDoController
  ],
  models: 
});

module.exports = app;
