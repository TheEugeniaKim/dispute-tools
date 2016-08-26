// Update with your config settings.
var pool = {
  min : 2,
  max : 10
};

module.exports = {
  test : {
    client: 'postgresql',
    connection: {
      host: 'postgres',
      user: 'postgres'
    },
    pool: pool,
    migrations: {}
  },
  development : {
    client: 'postgresql',
    connection: {},
    pool: pool,
    migrations: {}
  }
};
