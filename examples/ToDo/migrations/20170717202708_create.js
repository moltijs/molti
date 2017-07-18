
exports.up = async function(knex) {
  await knex.schema.createTable('Users', (table) => {
    table.increments('id');
    table.string('email');
  });

  await knex.schema.createTable('Todos', (table) => {
    table.increments('id');
    table.string('task');
    table.integer('userId').references('Users.id');
    table.timestamp('dueDate');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('Todos');
  await knex.schema.dropTable('Users');
};
