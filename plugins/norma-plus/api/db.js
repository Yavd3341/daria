// Database users
var login, gatherer, user;

// External config and library
var config;
var postgres;

// Internal variables
var usesDefaultHost;
var connected;

function resolvePaymentsData(data) {
  let spendings = [];
  let payments = [];

  let lastMonth = new Date(); // Get current date and time
  lastMonth.setHours(0, 0, 0, 0); // Reset time to midnight
  lastMonth.setMonth(lastMonth.getMonth(), 1); // Reset date to 1st of the next month


  for (let i = data.length - 2; i >= 0; i--) {
    const month = data[i];

    if (month.payments?.length > 0) {
      payments.push(month.payments);

      date = month.payments[0].date;
      lastMonth.setFullYear(date.getFullYear(), date.getMonth(), 1);
    }

    spendings.push(
      month.spendings.map(
        spending => ({
          date: new Date(lastMonth),
          name: spending.name,
          cost: spending.cost
        })
      )
    );

    lastMonth.setMonth(lastMonth.getMonth() - 1);
  }

  return { spendings: spendings.flat(), payments: payments.flat() }
}

function onDefaultHostChange(event) {
  if (usesDefaultHost && event == "postgres-default-host-updated")
    tryConnect();
}

async function tryConnect() {
  function isValidUser(user) {
    return user.user && user.password;
  }

  if (!config.database.database 
   || !isValidUser(config.credentials.login)
   || !isValidUser(config.credentials.gatherer)
   || !isValidUser(config.credentials.user))
    return false;

  await Promise.allSettled([
    login?.end(),
    gatherer?.end(),
    user?.end()
  ]);

  connected = false;

  usesDefaultHost = !config.database.host || !config.database.port;
  const db = usesDefaultHost
    ? {
        ...postgres.getDefaultHost(), 
        database: config.database.database
      }
    : config.database;

  login = postgres.makePool(config.credentials.login, db);
  gatherer = postgres.makePool(config.credentials.gatherer, db);
  user = postgres.makePool(config.credentials.user, db);

  try {
    await Promise.all([
      login.query("SELECT NOW()"),
      gatherer.query("SELECT NOW()"),
      user.query("SELECT NOW()")
    ]);
    connected = true;
  }
  catch (e) {
    console.error("[Norma PLUS] " + e);
  }

  return connected;
}

module.exports = {
  async init(pgLib, cfg, eventBus) {
    config = cfg;
    postgres = pgLib;

    eventBus.registerListener(onDefaultHostChange);

    await this.tryConnect();
  },

  tryConnect,
  isConnected() {
    return connected;
  },

  async getManagedAccounts() {
    return login?.query({
      text: "SELECT account FROM accounts",
      rowMode: "array"
    }).then(response => response.rows.flat())
  },

  async deleteAccount(account) {
    return login?.query("DELETE FROM accounts WHERE account = $1", [account])
  },

  async getLoginInfo(account) {
    return account 
      ? login?.getRows("SELECT * FROM accounts WHERE account = $1", [account])
          .then(rows => rows.length != 0 ? rows[0] : undefined)
      : login?.getRows("SELECT * FROM accounts")
  },

  async updateLoginInfo(credentials) {
    if (credentials?.account && credentials.username && credentials.password)
      return login?.query(
        "INSERT INTO accounts VALUES ($1, $2, $3) ON CONFLICT (account) DO UPDATE SET username = EXCLUDED.username, password = EXCLUDED.password", 
        [credentials.account, credentials.username, credentials.password]
      );
  },

  async addRecords(records) {
    const client = await gatherer?.connect();

    if (!client)
      return;

    for (const group of records) {
      let { spendings, payments } = resolvePaymentsData(group.data);

      console.log(`[Norma PLUS] Adding records for ${group.account}: ${spendings.length} spendings,  ${payments.length} payments`)
      
      for (const payment of payments)
        client.query({
          name: "add-payment",
          text: "INSERT INTO payments VALUES ($1, $2, $3, $4)",
          values: [group.account, payment.date, payment.source, payment.amount]
        }).catch(e => console.error("[Norma PLUS] " + e));
  
      for (const spending of spendings)
        client.query({
          name: "add-spending",
          text: "INSERT INTO spendings VALUES ($1, $2, $3, $4)",
          values: [group.account, spending.date, spending.name, spending.cost]
        }).catch(e => console.error("[Norma PLUS] " + e));
    }
    client.release();
  },

  async getRecords(account, days) {
    const sqlDays = days ? " AND NOW() - date < $2" : "";
    return user?.getRows(
      `WITH records AS (SELECT account, date, comment, -amount amount FROM spendings WHERE account = $1${sqlDays} UNION SELECT * FROM payments WHERE account = $1${sqlDays}) SELECT * FROM records ORDER BY date DESC`,
      [account, days + " days"]);
  }
};