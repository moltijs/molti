const { Schema, ModelFactory } = require('molti');

const userSchema = new Schema({
  email: {
    type: Schema.Types.String
  },
  // molti infers related model (todos -> Todo)
  todos: {
    type: Schema.Types.Models
  }
});

class User extends ModelFactory(userSchema) {
  static async getUserString(id) {
    let user = await this.findById(id, {
      withRelated: ['todos']
    });
    return user.getTasksString();
  }
  getTasksString() {
    return this.todos.map(todo => todo.info).join('\n');
  }
}

module.exports = User;