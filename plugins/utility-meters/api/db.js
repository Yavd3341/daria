// Database users
var admin, gatherer, guest;

// External config and library
var config;
var postgres;

// Internal variables
var usesDefaultHost;
var connected;

function errorHandler(error) {
  console.error("[Utility Meters] " + error);
  return undefined;
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
   || !isValidUser(config.credentials.admin)
   || !isValidUser(config.credentials.gatherer)
   || !isValidUser(config.credentials.guest))
    return false;

  await Promise.allSettled([
    admin?.end(),
    gatherer?.end(),
    guest?.end()
  ]);

  connected = false;

  usesDefaultHost = !config.database.host || !config.database.port;
  const db = usesDefaultHost
    ? {
        ...postgres.getDefaultHost(), 
        database: config.database.database
      }
    : config.database;

  admin = postgres.makePool(config.credentials.admin, db);
  gatherer = postgres.makePool(config.credentials.gatherer, db);
  guest = postgres.makePool(config.credentials.guest, db);

  try {
    await Promise.all([
      admin.query("SELECT NOW()"),
      gatherer.query("SELECT NOW()"),
      guest.query("SELECT NOW()")
    ]);
    connected = true;
  }
  catch (error) {
    errorHandler(error);
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

  // Get info

  async getMeters(id) {
    return (id != undefined
      ? guest?.query("SELECT * FROM meters WHERE id = $1", [id])
      : guest?.query("SELECT * FROM meters"))
        .then(response => response.rows).catch(errorHandler)
  },

  async getTariffs(id) {
    return (id != undefined
      ? guest?.query("SELECT * FROM tariffs WHERE id = $1", [id])
      : guest?.query("SELECT * FROM tariffs"))
        .then(response => response.rows).catch(errorHandler)
  },

  async getGroups(id) {
    return (id != undefined
      ? guest?.query("SELECT * FROM groups WHERE id = $1", [id])
      : guest?.query("SELECT * FROM groups"))
        .then(response => response.rows).catch(errorHandler)
  },

  async getMetersInGroup(groupId) {
    return guest?.query("SELECT meters.* FROM meters LEFT JOIN group_links ON group_links.meter_id = id WHERE group_id = $1", [groupId])
      .then(response => response.rows).catch(errorHandler)
  },

  // Edit info
  
  async insertMeter(comment, tariffId) {
    return admin?.query("INSERT INTO meters(comment, tariff) VALUES ($1, $2) RETURNING ID", [comment, tariffId])
      .then(response => response.rows[0].id).catch(errorHandler)
  },
  async updateMeter(id, comment, tariffId) {
    let cols = [];
    let data = [id];
    let counter = 2;

    if (comment != undefined) {
        cols.push(`comment = $${counter++}`);
        data.push(comment);
    }
    if (tariffId != undefined) {
        cols.push(`tariff = $${counter++}`);
        data.push(tariffId);
    }

    if (cols.length)
      return admin.query(`UPDATE meters SET ${cols.join(',')} WHERE id = $1`, data);
  },
  async deleteMeter(id) {
    return admin.query('DELETE FROM meters WHERE id = $1', [id]);
  },
  
  async insertTariff(comment) {
    return admin?.query("INSERT INTO tariffs(comment) VALUES ($1) RETURNING ID", [comment])
      .then(response => response.rows[0].id).catch(errorHandler)
  },
  async updateTariff(id, comment) {
    return admin.query("UPDATE tariffs SET comment = $2 WHERE id = $1", [id, comment])
      .catch(errorHandler);
  },
  async deleteTariff(id) {
      return admin.query('DELETE tariffs WHERE id = $1', [id]);
  },
  
  async insertGroup(comment) {
    return admin?.query("INSERT INTO groups(comment) VALUES ($1) RETURNING ID", [comment])
      .then(response => response.rows[0].id).catch(errorHandler)
  },
  async updateGroup(id, comment) {
    return admin.query("UPDATE groups SET comment = $2 WHERE id = $1", [id, comment])
      .catch(errorHandler);
  },
  async deleteGroup(id) {
      return admin.query('DELETE groups WHERE id = $1', [id]);
  },
  
  async linkMeterToGroup(meterId, groupId) {
    return admin?.query("INSERT INTO group_links(meter_id, group_id) VALUES ($1, $2)", [meterId, groupId])
      .catch(errorHandler)
  },
  async unlinkMeterFromGroup(meterId, groupId) {
    return admin.query("DELETE group_links WHERE meter_id = $1 AND group_id = $2", [meterId, groupId])
      .catch(errorHandler);
  },

  // Get historic data

  async getMeterLog(id, maxMonths) {
    return (maxMonths
      ? guest?.query("SELECT date, value FROM meter_log WHERE meter = $1 AND NOW() - date < $2", [id, maxMonths + " MONTHS"])
      : guest?.query("SELECT date, value FROM meter_log WHERE meter = $1", [id]))
        .then(response => response.rows).catch(errorHandler)
  },

  async getTariffHistory(id, maxMonths) {
    return (maxMonths
      ? guest?.query("SELECT date, value FROM tariff_history WHERE tariff = $1 AND NOW() - date < $2", [id, maxMonths + " MONTHS"])
      : guest?.query("SELECT date, value FROM tariff_history WHERE tariff = $1", [id]))
        .then(response => response.rows).catch(errorHandler)
  },

  // Upsert historic data

  async upsertTariffValue(tariffId, value, date) {
    return gatherer?.query("INSERT INTO tariff_history(tariff, value, date) VALUES ($1, $2, $3) ON CONFLICT DO UPDATE SET value = EXCLUDED.value",
      [tariffId, value, date])
        .catch(errorHandler)
  },
  async upsertMeterReading(meterId, reading, date) {
    return gatherer?.query("INSERT INTO meter_log(meter, value, date) VALUES ($1, $2, $3) ON CONFLICT DO UPDATE SET value = EXCLUDED.value",
      [meterId, reading, date])
        .catch(errorHandler)
  },

  // Extra requests

  async getCurrentMeterInfo(id, isGroupId = false) {
    const sqlWhereId = id 
      ? isGroupId
        ? "WHERE meter = $1"
        : "WHERE meter IN (SELECT meter_id FROM group_links WHERE group_id = $1)"
      : ""
    return guest?.query(`SELECT DISTINCT ON (meter) date, reading, difference, tariff, cost, cost - LAG(cost, 1) OVER (PARTITION BY meter ORDER BY date) cost_difference FROM meter_log_full ${sqlWhereId} ORDER BY meter, date DESC`, id ? [id] : [])
      .then(response => response.rows).catch(errorHandler)
  },

  async getCurrentTariff(id) {
    const sqlWhereId = id ? "WHERE tariff = $1" : ""
    return guest?.query(`WITH last_entry AS (SELECT DISTINCT (tariff) tariff, date, value FROM tariff_history ORDER BY date DESC) SELECT tariffs.*, date since, value FROM tariffs LEFT JOIN last_entry ON tariff = id ${sqlWhereId}`, id ? [id] : [])
      .then(response => response.rows).catch(errorHandler)
  },

  async getMeterLogWithTariff(id, maxMonths) {
    const sqlWhereMonths = maxMonths 
      ? "AND NOW() - date < $2"
      : ""
    return guest?.query(`SELECT date, reading, difference, tariff, cost, cost - LAG(cost, 1) OVER (PARTITION BY meter ORDER BY date) cost_difference FROM meter_log_full WHERE meter = $1 ${sqlWhereMonths} ORDER BY date DESC`,
      maxMonths ? [id, maxMonths + "MONTHS"] : [id])
        .then(response => response.rows).catch(errorHandler)
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
      sqlWhereMonths = `WHERE NOW() - date < $${data.length})`
    }

    return guest?.query(`WITH log AS (SELECT DATE_TRUNC('month', date - '1 WEEK'::INTERVAL) date, cost FROM meter_log_full LEFT JOIN meters ON meters.id = meter ${sqlWhereId}) SELECT date, SUM(cost)::INT cost FROM log GROUP BY date ${sqlWhereMonths} ORDER BY date DESC`, data)
      .then(response => response.rows).catch(errorHandler)
  },
};