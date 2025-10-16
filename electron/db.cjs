const { app } = require('electron')
const path = require('path')
const fs = require('fs')
let Low
let JSONFile

async function loadLowdb() {
  // lowdb از نوع ESM است؛ در CommonJS باید پویا import شود
  const lowdb = await import('lowdb')
  const lowdbNode = await import('lowdb/node')
  Low = lowdb.Low
  JSONFile = lowdbNode.JSONFile
}

const defaultData = {
  members: [],
  attendanceLogs: [],
  payments: [],
  invoices: [],
  chatMemory: [],
  chatLogs: [],
}

let db

async function init() {
  if (!Low || !JSONFile) {
    await loadLowdb()
  }
  const userDataPath = app.getPath('userData')
  const file = path.join(userDataPath, 'gym-handler.json')
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true })
  const adapter = new JSONFile(file)
  db = new Low(adapter, defaultData)
  await db.read()
  db.data ||= defaultData
  await db.write()
}

function generateId(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10)
}

// Members
async function getMembers() { await db.read(); return db.data.members }
async function getMember(id) { await db.read(); return db.data.members.find(m => m.id === id) }
async function createMember(payload) {
  await db.read()
  const member = { id: generateId('m_'), createdAt: Date.now(), level: 'basic', role: 'member', status: 'active', ...payload }
  db.data.members.push(member)
  await db.write()
  return member
}
async function updateMember(id, payload) {
  await db.read()
  const idx = db.data.members.findIndex(m => m.id === id)
  if (idx === -1) return null
  db.data.members[idx] = { ...db.data.members[idx], ...payload, updatedAt: Date.now() }
  await db.write()
  return db.data.members[idx]
}
async function removeMember(id) {
  await db.read()
  db.data.members = db.data.members.filter(m => m.id !== id)
  await db.write()
  return true
}

// Attendance
async function logAttendance(memberId, type, at = undefined) {
  await db.read()
  if (!memberId || typeof memberId !== 'string') {
    throw new Error('شناسه عضو نامعتبر است.')
  }
  const memberExists = db.data.members.some(m => m.id === memberId)
  if (!memberExists) {
    throw new Error('عضو یافت نشد.')
  }
  const validTypes = ['enter', 'exit']
  if (!validTypes.includes(type)) {
    throw new Error('نوع حضور نامعتبر است.')
  }
  const atTs = at != null ? Number(at) : Date.now()
  if (!atTs || !isFinite(atTs) || atTs < 0) {
    throw new Error('زمان حضور نامعتبر است.')
  }
  const log = { id: generateId('a_'), memberId, type, at: atTs }
  db.data.attendanceLogs.push(log)
  await db.write()
  return log
}
async function getAttendance(memberId) {
  await db.read()
  return db.data.attendanceLogs.filter(l => l.memberId === memberId)
}

// Attendance (all)
async function getAllAttendance() {
  await db.read()
  return db.data.attendanceLogs
}

// Chat memory & logs
async function addChatMemory(entry) {
  await db.read()
  if (!entry || typeof entry !== 'object') throw new Error('رکورد دانش چت نامعتبر است.')
  const { pattern, intent, answer } = entry
  const pat = typeof pattern === 'string' ? pattern.trim() : ''
  const ans = typeof answer === 'string' ? answer.trim() : ''
  const intentStr = typeof intent === 'string' ? intent.trim() : ''
  if (!pat && !intentStr) throw new Error('حداقل یکی از الگو یا نیت لازم است.')
  const row = { id: generateId('cm_'), createdAt: Date.now(), pattern: pat, intent: intentStr, answer: ans }
  db.data.chatMemory.push(row)
  await db.write()
  return row
}

async function getChatMemory() {
  await db.read()
  return db.data.chatMemory || []
}

async function addChatLog(log) {
  await db.read()
  if (!log || typeof log !== 'object') throw new Error('لاگ چت نامعتبر است.')
  const { user, message, reply, memoryId } = log
  const row = { id: generateId('cl_'), createdAt: Date.now(), user: user || 'manager', message: String(message||''), reply: String(reply||''), memoryId: memoryId || null }
  db.data.chatLogs.push(row)
  await db.write()
  return row
}

// Finance
async function addPayment(payment) {
  await db.read()
  if (!payment || typeof payment !== 'object') {
    throw new Error('پرداخت نامعتبر است.')
  }
  const { memberId, amount, note } = payment
  if (!memberId || typeof memberId !== 'string') {
    throw new Error('شناسه عضو نامعتبر است.')
  }
  const memberExists = db.data.members.some(m => m.id === memberId)
  if (!memberExists) {
    throw new Error('عضو یافت نشد.')
  }
  const amountNum = Number(amount)
  if (!amountNum || !isFinite(amountNum) || amountNum <= 0) {
    throw new Error('مبلغ پرداخت نامعتبر است.')
  }
  const row = { id: generateId('p_'), createdAt: Date.now(), memberId, amount: amountNum, note: typeof note === 'string' ? note : '' }
  db.data.payments.push(row)
  // Create linked invoice for this payment
  const invoice = {
    id: generateId('inv_'),
    createdAt: row.createdAt,
    memberId: row.memberId,
    amount: row.amount,
    currency: 'IRR',
    date: undefined,
    notes: row.note || '',
    paymentId: row.id,
  }
  db.data.invoices.push(invoice)
  await db.write()
  return row
}
async function getPayments(memberId) {
  await db.read()
  return db.data.payments.filter(p => !memberId || p.memberId === memberId)
}
async function getInvoices() { await db.read(); return db.data.invoices }

// Backfill: ensure invoices exist for all payments
async function backfillInvoicesFromPayments() {
  await db.read()
  const payments = db.data.payments || []
  db.data.invoices ||= []
  const existingPaymentIds = new Set((db.data.invoices || []).map(i => i && i.paymentId).filter(Boolean))
  let created = 0
  for (const p of payments) {
    if (!p || typeof p !== 'object') continue
    if (existingPaymentIds.has(p.id)) continue
    if (!p.memberId || !p.amount || !p.createdAt) continue
    const inv = {
      id: generateId('inv_'),
      createdAt: p.createdAt,
      memberId: p.memberId,
      amount: Number(p.amount) || 0,
      currency: 'IRR',
      date: undefined,
      notes: p.note || '',
      paymentId: p.id,
    }
    db.data.invoices.push(inv)
    created += 1
  }
  await db.write()
  return { created, totalInvoices: db.data.invoices.length, totalPayments: payments.length }
}

// Cleanup: remove payments and attendance logs referencing non-existing members
async function cleanupOrphanedData() {
  await db.read()
  const members = db.data.members || []
  const memberIds = new Set(members.map(m => m.id))
  const beforePayments = (db.data.payments || []).length
  const beforeAttendance = (db.data.attendanceLogs || []).length

  db.data.payments = (db.data.payments || []).filter(p => p && typeof p.memberId === 'string' && memberIds.has(p.memberId))
  db.data.attendanceLogs = (db.data.attendanceLogs || []).filter(l => l && typeof l.memberId === 'string' && memberIds.has(l.memberId))
  await db.write()

  return {
    removedPayments: beforePayments - db.data.payments.length,
    removedAttendance: beforeAttendance - db.data.attendanceLogs.length,
    remainingMembers: members.length,
    remainingPayments: db.data.payments.length,
    remainingAttendance: db.data.attendanceLogs.length,
  }
}

// Cleanup: remove `email` field from all members (legacy field)
async function cleanupEmailField() {
  await db.read()
  let removedCount = 0
  const members = db.data.members || []
  db.data.members = members.map(m => {
    if (m && typeof m === 'object' && Object.prototype.hasOwnProperty.call(m, 'email')) {
      const { email, ...rest } = m
      removedCount += 1
      return rest
    }
    return m
  })
  await db.write()
  return {
    removedEmailFromMembers: removedCount,
    remainingMembers: db.data.members.length,
  }
}

// Wipe: remove all data permanently
async function wipeAllData() {
  await db.read()
  const before = {
    members: (db.data.members || []).length,
    attendanceLogs: (db.data.attendanceLogs || []).length,
    payments: (db.data.payments || []).length,
    invoices: (db.data.invoices || []).length,
    chatMemory: (db.data.chatMemory || []).length,
    chatLogs: (db.data.chatLogs || []).length,
  }
  db.data.members = []
  db.data.attendanceLogs = []
  db.data.payments = []
  db.data.invoices = []
  db.data.chatMemory = []
  db.data.chatLogs = []
  await db.write()
  return {
    removedMembers: before.members,
    removedAttendance: before.attendanceLogs,
    removedPayments: before.payments,
    removedInvoices: before.invoices,
    removedChatMemory: before.chatMemory,
    removedChatLogs: before.chatLogs,
  }
}

// Utilities: database file path, backup and restore
function getDbFilePath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'gym-handler.json')
}

async function backupTo(destPath) {
  const src = getDbFilePath()
  await db.read()
  // Ensure destination directory exists
  const dir = path.dirname(destPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  // Copy file (atomic-ish)
  fs.copyFileSync(src, destPath)
  return { ok: true, src, dest: destPath }
}

async function restoreFrom(sourcePath) {
  // Basic validation: extension and max size ~10MB
  const ext = path.extname(sourcePath).toLowerCase()
  if (ext !== '.json') {
    throw new Error('فایل انتخابی باید با پسوند JSON باشد.')
  }
  const stat = fs.statSync(sourcePath)
  const maxBytes = 10 * 1024 * 1024
  if (stat.size > maxBytes) {
    throw new Error('حجم فایل بیش از حد مجاز است (بیش از ۱۰MB).')
  }
  // Parse and validate structure
  const raw = fs.readFileSync(sourcePath, 'utf-8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('ساختار فایل JSON نامعتبر است.')
  }
  const keys = ['members', 'attendanceLogs', 'payments', 'invoices']
  for (const k of keys) {
    if (!parsed.hasOwnProperty(k) || !Array.isArray(parsed[k])) {
      throw new Error('ساختار داده نامعتبر است؛ کلیدها یا نوع داده‌ها درست نیست.')
    }
  }
  // Replace DB file then re-init
  const dest = getDbFilePath()
  fs.copyFileSync(sourcePath, dest)
  await init()
  await db.read()
  return { ok: true, source: sourcePath, dest }
}

module.exports = {
  init,
  getMembers,
  getMember,
  createMember,
  updateMember,
  removeMember,
  logAttendance,
  getAttendance,
  getAllAttendance,
  addPayment,
  getPayments,
  getInvoices,
  backfillInvoicesFromPayments,
  cleanupOrphanedData,
  cleanupEmailField,
  wipeAllData,
  getDbFilePath,
  backupTo,
  restoreFrom,
  // Chat memory/logs
  addChatMemory,
  getChatMemory,
  addChatLog,
}