// Database users
var admin, gatherer, guest

// External config and library
var config
var postgres

// Internal variables
var usesDefaultHost
var connected

function errorHandler(error) {
  console.error("[Utility Meters] " + error)
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
   || !isValidUser(config.credentials.admin)
   || !isValidUser(config.credentials.gatherer)
   || !isValidUser(config.credentials.guest))
    return false

  await Promise.allSettled([
    admin?.end(),
    gatherer?.end(),
    guest?.end()
  ])

  connected = false

  usesDefaultHost = !config.database.host || !config.database.port
  const db = usesDefaultHost
    ? {
        ...postgres.getDefaultHost(), 
        database: config.database.database
      }
    : config.database

  admin = postgres.makePool(config.credentials.admin, db)
  gatherer = postgres.makePool(config.credentials.gatherer, db)
  guest = postgres.makePool(config.credentials.guest, db)

  try {
    await Promise.all([
      admin.query("SELECT NOW()"),
      gatherer.query("SELECT NOW()"),
      guest.query("SELECT NOW()")
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

  // Get info

  async getMeters(id) {
    return (id != undefined
      ? guest?.getRows("SELECT * FROM meters WHERE id = $1", [id])
      : guest?.getRows("SELECT * FROM meters"))
        .catch(errorHandler)
  },

  async getTariffs(id) {
    return (id != undefined
      ? guest?.getRows("SELECT * FROM tariffs WHERE id = $1", [id])
      : guest?.getRows("SELECT * FROM tariffs"))
        .catch(errorHandler)
  },

  async getGroups(id) {
    return (id != undefined
      ? guest?.getRows("SELECT * FROM groups WHERE id = $1", [id])
      : guest?.getRows("SELECT * FROM groups"))
        .catch(errorHandler)
  },

  async getMetersInGroup(groupId) {
    return guest?.getRows("SELECT meters.* FROM meters LEFT JOIN group_links ON group_links.meter_id = id WHERE group_id = $1", [groupId])
      .catch(errorHandler)
  },

  // Edit info
  
  async insertMeter(comment, tariffId) {
    return admin?.query("INSERT INTO meters(comment, tariff) VALUES ($1, $2) RETURNING ID", [comment, tariffId])
      .then(response => response.rows[0].id).catch(errorHandler)
  },
  async updateMeter(id, comment, tariffId) {
    let cols = []
    let data = [id]
    let counter = 2

    if (comment != undefined) {
        cols.push(`comment = $${counter++}`)
        data.push(comment)
    }
    if (tariffId != undefined) {
        cols.push(`tariff = $${counter++}`)
        data.push(tariffId)
    }

    if (cols.length)
      return admin.query(`UPDATE meters SET ${cols.join(',')} WHERE id = $1`, data)
  },
  async deleteMeter(id) {
    return admin.query('DELETE FROM meters WHERE id = $1', [id])
  },
  
  async insertTariff(comment) {
    return admin?.query("INSERT INTO tariffs(comment) VALUES ($1) RETURNING ID", [comment])
      .then(response => response.rows[0].id).catch(errorHandler)
  },
  async updateTariff(id, comment) {
    return admin.query("UPDATE tariffs SET comment = $2 WHERE id = $1", [id, comment])
      .catch(errorHandler)
  },
  async deleteTariff(id) {
      return admin.query('DELETE FROM tariffs WHERE id = $1', [id])
  },
  
  async insertGroup(comment) {
    return admin?.query("INSERT INTO groups(comment) VALUES ($1) RETURNING ID", [comment])
      .then(response => response.rows[0].id).catch(errorHandler)
  },
  async updateGroup(id, comment) {
    return admin.query("UPDATE groups SET comment = $2 WHERE id = $1", [id, comment])
      .catch(errorHandler)
  },
  async deleteGroup(id) {
      return admin.query('DELETE FROM groups WHERE id = $1', [id])
  },
  
  async linkMeterToGroup(meterId, groupId) {
    return admin?.query("INSERT INTO group_links(meter_id, group_id) VALUES ($1, $2)", [meterId, groupId])
      .catch(errorHandler)
  },
  async unlinkMeterFromGroup(meterId, groupId) {
    return admin.query("DELETE FROM group_links WHERE meter_id = $1 AND group_id = $2", [meterId, groupId])
      .catch(errorHandler)
  },

  // Get historic data

  async getMeterLog(id, maxMonths) {
    return (maxMonths
      ? guest?.getRows("SELECT date, value FROM meter_log WHERE meter = $1 AND NOW() - date < $2", [id, maxMonths + " MONTHS"])
      : guest?.getRows("SELECT date, value FROM meter_log WHERE meter = $1", [id]))
        .catch(errorHandler)
  },

  async getTariffHistory(id, maxMonths) {
    return (maxMonths
      ? guest?.getRows("SELECT date, value FROM tariff_history WHERE tariff = $1 AND NOW() - date < $2", [id, maxMonths + " MONTHS"])
      : guest?.getRows("SELECT date, value FROM tariff_history WHERE tariff = $1", [id]))
        .catch(errorHandler)
  },

  // Upsert historic data

  async upsertTariffValue(tariffId, value, date) {
    return gatherer?.query("INSERT INTO tariff_history(tariff, value, date) VALUES ($1, $2, $3) ON CONFLICT (tariff, date) DO UPDATE SET value = EXCLUDED.value",
      [tariffId, value, date])
        .catch(errorHandler)
  },
  async upsertMeterReading(meterId, reading, date) {
    return gatherer?.query("INSERT INTO meter_log(meter, value, date) VALUES ($1, $2, $3) ON CONFLICT (meter, date) DO UPDATE SET value = EXCLUDED.value",
      [meterId, reading, date])
        .catch(errorHandler)
  },

  // Extra requests

  async getCurrentMeterState() {
    return guest?.getRows("WITH log AS (SELECT DISTINCT ON (meter) meter, date, value reading FROM meter_log ORDER BY meter, date DESC) SELECT id, comment, date, reading, tariff FROM meters LEFT JOIN log ON id = meter ORDER BY meter")
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
    
    return guest?.getRows(`WITH last AS (SELECT DISTINCT ON (meter) meter, date, reading, difference, tariff, cost, cost - LAG(cost, 1) OVER (PARTITION BY meter ORDER BY date) cost_difference FROM meter_log_full ${sqlWhereId} ORDER BY meter, date DESC) SELECT comment, last.* FROM last LEFT JOIN meters ON meter = id ${sqlWhereMonths}`, data)
      .catch(errorHandler)
  },

  async getCurrentTariff(id) {
    const sqlWhereId = id ? "WHERE tariff = $1" : ""
    return guest?.getRows(`WITH last_entry AS (SELECT DISTINCT (tariff) tariff, date, value FROM tariff_history ORDER BY date DESC) SELECT tariffs.*, date since, value FROM tariffs LEFT JOIN last_entry ON tariff = id ${sqlWhereId}`, id ? [id] : [])
      .catch(errorHandler)
  },

  async getTariffsWithHistory() {
    return guest?.getJson("WITH tmp AS (SELECT tariff, json_agg(json_build_object('date', date, 'price', value) ORDER BY date DESC) history FROM tariff_history GROUP BY tariff) SELECT json_agg(json_build_object('id', id, 'comment', comment, 'history', COALESCE(history, '[]'))) data FROM tariffs LEFT JOIN tmp ON id = tariff")
      .catch(errorHandler)
  },

  async getGroupsWithMeters() {
    return guest?.getJson("WITH tmp AS (SELECT group_id, json_agg(id ORDER BY id) meters FROM group_links LEFT JOIN meters ON meter_id = id GROUP BY group_id) SELECT json_agg(json_build_object('id', id, 'comment', comment, 'meters', COALESCE(meters, '[]'))) data FROM groups LEFT JOIN tmp ON id = group_id")
      .catch(errorHandler)
  },

  async getMeterLogWithTariff(id, maxMonths) {
    const sqlWhereMonths = maxMonths 
      ? "AND NOW() - date < $2"
      : ""
    return guest?.getRows(`SELECT date, reading, difference, tariff, cost, cost - LAG(cost, 1) OVER (PARTITION BY meter ORDER BY date) cost_difference FROM meter_log_full WHERE meter = $1 ${sqlWhereMonths} ORDER BY date DESC`,
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

    return guest?.getRows(`WITH log AS (SELECT DATE_TRUNC('month', date - '1 WEEK'::INTERVAL) date, difference, cost FROM meter_log_full LEFT JOIN meters ON meters.id = meter ${sqlWhereId}), summary AS (SELECT date, SUM(difference)::INT sum, SUM(cost)::INT cost FROM log GROUP BY date) SELECT date, sum, sum - LAG(sum, 1) OVER win difference, cost, cost - LAG(cost, 1) OVER win cost_difference FROM summary WHERE sum IS NOT NULL ${sqlWhereMonths} WINDOW win AS (ORDER BY date) ORDER BY date DESC`, data)
      .catch(errorHandler)
  },
}