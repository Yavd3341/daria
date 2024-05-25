var needle = undefined

const API = "https://ok.dtek-oem.com.ua/api/"

const LOGIN_MAP = {}
const ACCOUNT_MAP = {}

module.exports = {
  init,
  
  login,
  getLoadedAccounts,
  getInfo,
  getReadings
}

function init(needleLib) {
  needle = needleLib
}

async function login(login, password, isPerson) {
  let type, loginField

  if (isPerson) {
    type = "person"
    loginField = "phone"
    login = "+380" + login
  }
  else {
    type = "entity"
    loginField = "account"
  }
  
  const response = await needle(
    "post",
    API + "auth/" + type,
    {
      language: "uk-UA",
      platform: "Win32",
      userType: type,
      [loginField]: login
    },
    {
      json: true,
      username: login,
      password: password
    }
  )

  const data = response.body

  if (data.status == "success") {
    const loginKey = isPerson + login

    LOGIN_MAP[loginKey] = {
      login: login,
      isPerson: isPerson,
      partner: data.user.partner,
      token: data.user.token
    }

    for (const account of data.accounts)
      ACCOUNT_MAP[account.account] = loginKey

    return true
  }
  else
    return false
}

async function getInfo(account) {
  const login = LOGIN_MAP[ACCOUNT_MAP[account]]
  const type = login.isPerson ? "person" : "entity"
  
  const response = await needle(
    "post",
    API + type + "/objects/info",
    {
      account: account,
      partner: login.partner,
      token: login.token
    },
    {
      json: true
    }
  )

  const data = response.body

  if (data.status == "success")
    return {
      address: data.place.address
    }
}

async function getCommon(account, method) {
  const login = LOGIN_MAP[ACCOUNT_MAP[account]]
  const type = login.isPerson ? "person" : "entity"
  
  const response = await needle(
    "post",
    API + "get-common",
    {
      account: account,
      token: login.token,
      url: `/${type}/${method}`
    },
    {
      json: true
    }
  )

  const data = response.body

  if (data.status == "success")
    return data
}

async function getReadings(account) {
  const data = await getCommon(account, "cust_data_history")
  if (data) {
    const readings = []

    for (const entry of data.data.items) {
      if (entry.blocked || entry.inactive)
        continue

      readings.push({
        date: new Date(entry.date.split('.').reverse().join('-')), // Convert DD.MM.YYYY format to ISO date
        value: Number(entry.value),
        scale: Number(entry.scale)
      })
    }

    return readings
  }
  else
    return []
}

function getLoadedAccounts() {
  return Object.keys(ACCOUNT_MAP)
}