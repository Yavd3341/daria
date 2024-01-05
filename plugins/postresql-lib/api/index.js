const { Pool, Client } = require("pg");

function makeRowsAccessor(queriable) {
  return (query, params) => 
    queriable
      .query(query, params)
      .then(result => result.rows);
}

function makeJsonAccessor(queriable) {
  return (query, params) => 
    queriable
      .query(query, params)
      .then(result => result.rows[0]?.data);
}

module.exports = {
  augment(queriable) {
    queriable.getRows = makeRowsAccessor(queriable);
    queriable.getJson = makeJsonAccessor(queriable);
  },

  makePool(credentials, db) {
    let pool = new Pool({...credentials, ...db});
    this.augment(pool);
    return pool;
  },
  makeClient(credentials, db) {
    let client = new Client({...credentials, ...db});
    this.augment(client);
    return client;
  }
};