// Database users
var loginUser, gatherer, user

// External config and library
var config
var postgres

// Internal variables
var usesDefaultHost
var connected

function errorHandler(error) {
  console.error("[DTEK] " + error)
  return undefined
}

function onDefaultHostChange(event) {
  if (usesDefaultHost && event == "postgres-default-host-updated")
    tryConnect()
}

async function tryConnect() {
  function isValidUser(user) {
    return user.user && user.password
  }

  if (!config.database.database 
   || !isValidUser(config.credentials.login)
   || !isValidUser(config.credentials.gatherer)
   || !isValidUser(config.credentials.user))
    return false

  await Promise.allSettled([
    loginUser?.end(),
    gatherer?.end(),
    user?.end()
  ])

  connected = false

  usesDefaultHost = !config.database.host || !config.database.port
  const db = usesDefaultHost
    ? {
        ...postgres.getDefaultHost(), 
        database: config.database.database
      }
    : config.database

  loginUser = postgres.makePool(config.credentials.login, db)
  gatherer = postgres.makePool(config.credentials.gatherer, db)
  user = postgres.makePool(config.credentials.user, db)

  try {
    await Promise.all([
      loginUser.query("SELECT NOW()"),
      gatherer.query("SELECT NOW()"),
      user.query("SELECT NOW()")
    ])
    connected = true
  }
  catch (error) {
    errorHandler(error)
  }

  return connected
}

module.exports = {
  async init(pgLib, cfg, eventBus) {
    config = cfg
    postgres = pgLib

    eventBus.registerListener(onDefaultHostChange)

    await this.tryConnect()
  },

  tryConnect,
  isConnected() {
    return connected
  },

  // Get historic data

  async getMeterLog(id, maxMonths) {
    return (maxMonths
      ? user?.getRows("SELECT date, value FROM meter_log WHERE meter = $1 AND NOW() - date < $2", [id, maxMonths + " MONTHS"])
      : user?.getRows("SELECT date, value FROM meter_log WHERE meter = $1", [id]))
        .catch(errorHandler)
  },

  async getTariffHistory(maxMonths) {
    return (maxMonths
      ? user?.getRows("SELECT date, value FROM tariff_history WHERE NOW() - date < $1", [maxMonths + " MONTHS"])
      : user?.getRows("SELECT date, value FROM tariff_history", []))
        .catch(errorHandler)
  },

  async getLogins() {
    return loginUser?.getRows("SELECT * FROM logins")
      .catch(errorHandler)
  },

  async getLoginInfo() {
    return loginUser?.getRows("SELECT login, is_person FROM logins")
      .catch(errorHandler)
  },

  async deleteLogin(login, isPerson) {
    return loginUser?.query("DELETE FROM logins WHERE login = $1 AND is_person = $2", [login, isPerson]).catch(errorHandler)
  },

  async upsertLogin(login, password, isPerson) {
    if (login && password && isPerson != undefined)
      return loginUser?.query(
        "INSERT INTO logins (login, password, is_person) VALUES ($1, $2, $3) ON CONFLICT (login, is_person) DO UPDATE SET password = EXCLUDED.password", 
        [login, password, isPerson]
      ).catch(errorHandler)
  },

  async getAccounts() {
    return user?.getRows("SELECT full_id account, address FROM accounts")
      .catch(errorHandler)
  },

  async deleteAccount(account) {
    return loginUser?.query("DELETE FROM accounts WHERE full_id = $1", [account]).catch(errorHandler)
  },

  async upsertAccountInfo(account, address) {
    return gatherer?.query("SELECT upsert_account($1, $2) id",
      [account, address])
        .then(result => result.rows[0].id).catch(errorHandler)
  },

  async upsertTariffValue(tariffId, value, date) {
    return gatherer?.query("INSERT INTO tariff_history(tariff, value, date) VALUES ($1, $2, $3) ON CONFLICT (tariff, date) DO UPDATE SET value = EXCLUDED.value",
      [tariffId, value, date])
        .catch(errorHandler)
  },
  async insertMeterReading(account, zone, reading, date) {
    return gatherer?.query("INSERT INTO meter_log(account, zone, value, date) VALUES ($1, $2, $3, $4)",
      [account, zone, reading, date])
        .catch(errorHandler)
  },

  // Extra requests

  async getCurrentMeterState() {
    return user?.getRows("WITH log AS (SELECT DISTINCT ON (meter) meter, date, value reading FROM meter_log ORDER BY meter, date DESC) SELECT id, comment, date, reading, tariff FROM meters LEFT JOIN log ON id = meter ORDER BY meter")
      .catch(errorHandler)
  },

  async getCurrentMeterInfo(id, isGroupId = false, maxMonths = undefined) {
    let data = []

    let sqlWhereId = ""
    if (id) {
      data.push(id)
      sqlWhereId = isGroupId
        ? `WHERE meter IN (SELECT meter_id FROM group_links WHERE group_id = $${data.length})`
        : `WHERE meter = $${data.length}`
    }

    let sqlWhereMonths = ""
    if (maxMonths) {
      data.push(maxMonths + " MONTHS")
      sqlWhereMonths = `WHERE NOW() - date < $${data.length}`
    }
    
    return user?.getRows(`WITH last AS (SELECT DISTINCT ON (meter) meter, date, reading, difference, tariff, cost, cost - LAG(cost, 1) OVER (PARTITION BY meter ORDER BY date) cost_difference FROM meter_log_full ${sqlWhereId} ORDER BY meter, date DESC) SELECT comment, last.* FROM last LEFT JOIN meters ON meter = id ${sqlWhereMonths}`, data)
      .catch(errorHandler)
  },

  async getCurrentTariff(id) {
    const sqlWhereId = id ? "WHERE tariff = $1" : ""
    return user?.getRows(`WITH last_entry AS (SELECT DISTINCT (tariff) tariff, date, value FROM tariff_history ORDER BY date DESC) SELECT tariffs.*, date since, value FROM tariffs LEFT JOIN last_entry ON tariff = id ${sqlWhereId}`, id ? [id] : [])
      .catch(errorHandler)
  },

  async getTariffsWithHistory() {
    return user?.getJson("WITH tmp AS (SELECT tariff, json_agg(json_build_object('date', date, 'price', value) ORDER BY date DESC) history FROM tariff_history GROUP BY tariff) SELECT json_agg(json_build_object('id', id, 'comment', comment, 'history', COALESCE(history, '[]'))) data FROM tariffs LEFT JOIN tmp ON id = tariff")
      .catch(errorHandler)
  },

  async getGroupsWithMeters() {
    return user?.getJson("WITH tmp AS (SELECT group_id, json_agg(id ORDER BY id) meters FROM group_links LEFT JOIN meters ON meter_id = id GROUP BY group_id) SELECT json_agg(json_build_object('id', id, 'comment', comment, 'meters', COALESCE(meters, '[]'))) data FROM groups LEFT JOIN tmp ON id = group_id")
      .catch(errorHandler)
  },

  async getMeterLogWithTariff(id, maxMonths) {
    const sqlWhereMonths = maxMonths 
      ? "AND NOW() - date < $2"
      : ""
    return user?.getRows(`SELECT date, reading, difference, tariff, cost, cost - LAG(cost, 1) OVER (PARTITION BY meter ORDER BY date) cost_difference FROM meter_log_full WHERE meter = $1 ${sqlWhereMonths} ORDER BY date DESC`,
      maxMonths ? [id, maxMonths + "MONTHS"] : [id])
        .catch(errorHandler)
  },

  async getMeterLogCostGraph(groupId, maxMonths) {
    let data = []

    let sqlWhereId = ""
    if (groupId) {
      data.push(groupId)
      sqlWhereId = `WHERE meter IN (SELECT meter_id FROM group_links WHERE group_id = $${data.length})`
    }

    let sqlWhereMonths = ""
    if (maxMonths) {
      data.push(maxMonths + " MONTHS")
      sqlWhereMonths = `AND NOW() - date < $${data.length}`
    }

    return user?.getRows(`WITH log AS (SELECT DATE_TRUNC('month', date - '1 WEEK'::INTERVAL) date, difference, cost FROM meter_log_full LEFT JOIN meters ON meters.id = meter ${sqlWhereId}), summary AS (SELECT date, SUM(difference)::INT sum, SUM(cost)::INT cost FROM log GROUP BY date) SELECT date, sum, sum - LAG(sum, 1) OVER win difference, cost, cost - LAG(cost, 1) OVER win cost_difference FROM summary WHERE sum IS NOT NULL ${sqlWhereMonths} WINDOW win AS (ORDER BY date) ORDER BY date DESC`, data)
      .catch(errorHandler)
  },
}