const { Schema, ModelFactory } = require('molti');

const todoSchema = new Schema({
  task: {
    type: Schema.Types.String
  },
  user: {
    type: Schema.Types.Model
  }
});

class Todo extends ModelFactory(todoSchema) {

}

module.exports = Todo;