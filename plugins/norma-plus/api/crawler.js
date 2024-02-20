const { parse } = require("node-html-parser")
const db = require("./db")
var needle = undefined

var sessions = []
var maxTries = 5

module.exports = {
  init, 
  
  login,
  deleteAccount,
  getSession,
  
  getManagedAccounts, 
  getUserInfo, 
  getPayments
}

function init(needleLib, config) {
  needle = needleLib
  maxTries = config.maxTries
}

async function login(credentials) {
  let creds = Number.isInteger(credentials)
    ? await db.getLoginInfo(credentials)
    : credentials

  if (!(creds && creds.account != 0 && creds.username && creds.password))
    return

  creds = { ...creds, authorize: "" }

  const response = await needle("post", "http://userstat.normaplus.com/index.php", creds)

  if (response.cookies) {
    // Session "secret" is not required and will be sent by backend if missing anyway
    sessions[creds.account] = Object.entries(response.cookies)[0][0]
    console.log("[Norma PLUS] New session acquired for account " + creds.account)
    return true
  }
  
  return false
}

async function deleteAccount(account) {
  const result = await db.deleteAccount(account)
    .then(true)
    .catch(false);

  if (result)
    delete sessions[account];

  return result;
}

async function getManagedAccounts() {
  const accounts = await db.getManagedAccounts()
  return accounts 
    ? Promise.all(
        accounts.map(
          account => getUserInfo(account)
            .then(userInfo => ({
              account,
              name: userInfo.name,
              address: userInfo.address
            }))
        )
      )
    : []
}

async function getUserInfo(account) {
  const response = await get("userinfo", account)

  if (!response)
    return undefined

  // Backend sends HTML snippet to be placed into container
  const root = parse(`<body>${response}</body>`, {
    voidTag: { tags: ["script", "img"] }
  })

  const infoRows = root.getElementsByTagName("tr").map(row => row.getElementsByTagName("td")[1])

  const userInfo = {
    date: new Date(infoRows[1].text),
    name: infoRows[2].text,
    address: infoRows[3].text,
    // Contains spaces, parenthesis and other non-phone text
    phones: infoRows[4].getElementsByTagName("p").map(phone => phone.text.replace(/[^+0-9]/g, ""))
  }

  return userInfo
}

async function getPayments(account) {
  const response = await get("payments", account)

  if (!response)
    return undefined

  // Backend sends HTML snippet to be placed into container
  // Backend sends incorrect HTML with ommited span end tag
  const root = parse(`<body>${response.replaceAll("Баланс:", "Баланс:</span>")}</body>`, {
    voidTag: { tags: ["script", "img"] }
  })

  const info = root.getElementsByTagName("table").map(extractPaymentInfo)

  return info
}

function getSession(account) {
  return sessions[account]
}

async function get(page, account, tryNumber) {
  if (!account || maxTries <= tryNumber)
    return undefined

  console.log(`[Norma PLUS] Fetching ${page} for account ${account}`)
  if (!sessions[account])
    await login(account)

  const response = await needle("get", `http://userstat.normaplus.com/templates/nav-${page}/index.php?session=${sessions[account]}`)

  if (response.body == "Текущая сессия устарела. Нажмите выход") {
    console.log("[Norma PLUS] Invalid session for account " + account)
    sessions[account] = undefined
    return await get(page, account, (tryNumber || 0) + 1)
  }
  else
    return response.body
}

function extractPaymentInfo(table) {
  // Exessive trims to remove whitespace around text (baked by backend)
  // The table has no DOM-friendly metadata to use for parsing, relying on text contents

  const rows = table.getElementsByTagName("tr")
  let cells = undefined
  let result = {}
  let rowNumber = 1;

  // Balance at the beginning of the month
  if (rows[rowNumber].text.trim().startsWith("Сумма на начало")) {
    result.prevBalance = Number(rows[rowNumber].getElementsByTagName("td")[rowNumber].text)
    rowNumber++
  }

  // Deposit log
  if (rows[rowNumber].text.trim().startsWith("История")) {
    result.payments = []

    while(rows[++rowNumber].text.trim()) {
      cells = rows[rowNumber].getElementsByTagName("td")
      result.payments.push({
        date: new Date(cells[0].text),
        source: cells[1].text,
        amount: Number(cells[2].text)
      })
    }
  }
  
  rowNumber += 2

  result.spendings = []

  // Internet, should always be present
  cells = rows[rowNumber++].getElementsByTagName("td")
  if (cells[3].text) {
    result.spendings.push({
      name: cells[2].text.trim(),
      cost: Number(cells[3].text)
    })
  }

  // IPTV, should always be present, but may be empty
  cells = rows[rowNumber++].getElementsByTagName("td")
  if (cells[3].text) {
    result.spendings.push({
      name: cells[2].text.trim(),
      cost: Number(cells[3].text)
    })
  }

  // Additional services (like static IP)
  if (rows[rowNumber++].text.trim().startsWith("Дополнительные услуги")) {
    while(rows[rowNumber].text.trim()) {
      cells = rows[rowNumber++].getElementsByTagName("td")
      result.spendings.push({
        name: cells[0].text.trim(),
        cost: Number(cells[1].text)
      })
    }
  }
  
  return result
}