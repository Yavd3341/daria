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

  async getMeterLog(account, zone, maxMonths) {
    return (maxMonths
      ? user?.getRows("SELECT date, value FROM meter_log WHERE account = $1 AND zone = $2 NOW() - date < $3", [account, zone, maxMonths + " MONTHS"])
      : user?.getRows("SELECT date, value FROM meter_log WHERE account = $1 AND zone = $2", [account, zone]))
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

  async getAccounts(id) {
    return (id
      ? user?.getRows("SELECT full_id account, address FROM accounts WHERE id = $1", [id])
      : user?.getRows("SELECT id, full_id account, address FROM accounts")
    ).catch(errorHandler)
  },

  async getZone(id) {
    return user?.getRows("SELECT name, coefficient FROM zones WHERE id = $1", [id])
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

  async getCurrentMeterInfo(account, type, maxMonths = undefined) {
    let data = []

    let sqlWhereId = ""
    if (account) {
      data.push(account)
      sqlWhereId = `WHERE account = $${data.length}`

      if (type) {
        data.push(type)
        sqlWhereId = `AND zone = $${data.length}`
      }
    }

    let sqlWhereMonths = ""
    if (maxMonths) {
      data.push(maxMonths + " MONTHS")
      sqlWhereMonths = `WHERE DATE_TRUNC('MONTH', NOW()) - month <= $${data.length}`
    }
    
    return user?.getRows(`WITH last AS (SELECT DISTINCT ON (account, zone) account, zone, month, reading, difference, tariff, cost, cost - LAG(cost, 1) OVER (PARTITION BY account, zone ORDER BY month) cost_difference FROM meter_log_full ${sqlWhereId} ORDER BY account, zone, month DESC) SELECT address, name zone_name, last.* FROM last LEFT JOIN accounts ON account = accounts.id LEFT JOIN zones ON zone = zones.id ${sqlWhereMonths}`, data)
      .catch(errorHandler)
  },

  async getCurrentTariff() {
    return user?.getRows("SELECT * FROM tariff_history ORDER BY date DESC LIMIT 1")
      .catch(errorHandler)
  },

  async getMeterLogWithTariff(account, type, maxMonths) {
    const sqlWhereMonths = maxMonths 
      ? "AND NOW() - month < $3"
      : ""
    return user?.getRows(`SELECT month, reading, difference, tariff, cost, cost - LAG(cost, 1) OVER (PARTITION BY account, zone ORDER BY month) cost_difference FROM meter_log_full WHERE account = $1 AND zone = $2 ${sqlWhereMonths} ORDER BY month DESC`,
      maxMonths ? [account, type, maxMonths + "MONTHS"] : [account, type])
        .catch(errorHandler)
  },

  async getMeterLogCostGraph(account, maxMonths) {
    let data = []

    let sqlWhereId = ""
    if (account) {
      data.push(account)
      sqlWhereId = `WHERE account = $${data.length}`
    }

    let sqlWhereMonths = ""
    if (maxMonths) {
      data.push(maxMonths + " MONTHS")
      sqlWhereMonths = `AND NOW() - month < $${data.length}`
    }

    const accountComma = account ? "account," : ""

    return user?.getRows(`WITH summary AS (SELECT ${accountComma}month, SUM(difference)::INT sum, SUM(cost)::INT cost FROM meter_log_full ${sqlWhereId} GROUP BY ${accountComma} month) SELECT ${accountComma} month, sum, sum - LAG(sum, 1) OVER win difference, cost, cost - LAG(cost, 1) OVER win cost_difference FROM summary WHERE sum IS NOT NULL ${sqlWhereMonths} WINDOW win AS (${account ? "PARTITION BY account" : ""} ORDER BY month) ORDER BY ${accountComma} month DESC`, data)
      .catch(errorHandler)
  },
}