
exports.up = function(knex, Promise) {
  return knex.schema.createTable('Users', (t) => {
    t.uuid('id').primary();
    t.string('email', 255).unique().notNullable();
    t.string('encrypted_password', 512).notNullable();
    t.string('activation_token', 512).notNullable();
    t.string('role', 128).notNullable();
    t.timestamps();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('Users');
};
