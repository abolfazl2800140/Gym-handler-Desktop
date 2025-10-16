const { app, BrowserWindow, ipcMain, shell, dialog, session } = require('electron')
const log = require('electron-log')
let Sentry
try { Sentry = require('@sentry/electron') } catch {}
let XLSX
try { XLSX = require('xlsx') } catch {}
const path = require('path')
const isDev = !app.isPackaged
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
const PROD_WATCH = process.env.PROD_WATCH === 'true'
const db = require('./db.cjs')
let llm
try { llm = require('./llm.cjs') } catch {}

let mainWindow
let distLoaded = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    backgroundColor: '#0b1324',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  if (isDev && !PROD_WATCH) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else if (PROD_WATCH) {
    // Show a lightweight placeholder until dist is ready
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<html><body style="background:#0b1324;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div><h2>در حال ساخت اپلیکیشن...</h2><p>لطفاً چند لحظه صبر کنید.</p></div></body></html>'))
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Prevent navigation away from our app
  mainWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault()
  })
}

app.whenReady().then(async () => {
  log.initialize({})
  log.info('[App] Starting up')
  await db.init()
  // Backfill invoices from existing payments to populate reports
  try {
    const res = await db.backfillInvoicesFromPayments()
    log.info('[Maintenance] backfillInvoicesFromPayments', res)
  } catch (e) {
    log.error('[Maintenance] Failed to backfill invoices', e)
  }
  // Cleanup legacy fields: remove `email` from members
  try {
    const res = await db.cleanupEmailField()
    log.info('[Maintenance] cleanupEmailField', res)
  } catch (e) {
    log.error('[Maintenance] Failed to cleanup email field', e)
  }
  // Optional full wipe via env flag (dangerous)
  if (process.env.WIPE_DB === 'true') {
    try {
      const res = await db.wipeAllData()
      console.log('[Data Wipe] All data removed', res)
    } catch (e) {
      console.error('[Data Wipe] Failed to wipe data', e)
    }
  }
  createWindow()

  // Harden permissions for any webContents
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (e) => {
      // Disallow webviews entirely
      e.preventDefault()
    })
  })

  // Deny all permission requests by default
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))

  // In prod-watch mode, load dist once ready and reload on further changes
  if (PROD_WATCH) {
    const fs = require('fs')
    const chokidar = require('chokidar')
    const distDir = path.join(__dirname, '../dist')
    const indexFile = path.join(distDir, 'index.html')

    const watcher = chokidar.watch(distDir, {
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      persistent: true,
    })

    const tryLoadIndex = () => {
      if (!distLoaded && fs.existsSync(indexFile)) {
        distLoaded = true
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadFile(indexFile)
        }
      }
    }

    // Attempt immediate load if build finished quickly
    tryLoadIndex()

    watcher.on('add', (filePath) => {
      if (filePath === indexFile) {
        tryLoadIndex()
      }
    })
    watcher.on('change', () => {
      if (distLoaded && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.reloadIgnoringCache()
      }
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC: Members
ipcMain.handle('members:list', async () => db.getMembers())
ipcMain.handle('members:get', async (_e, id) => db.getMember(id))
ipcMain.handle('members:create', async (_e, payload) => {
  const res = await db.createMember(payload)
  mainWindow?.webContents?.send('data:changed', { scope: 'members', action: 'create', id: res?.id })
  return res
})
ipcMain.handle('members:update', async (_e, id, payload) => {
  const res = await db.updateMember(id, payload)
  mainWindow?.webContents?.send('data:changed', { scope: 'members', action: 'update', id })
  return res
})
ipcMain.handle('members:remove', async (_e, id) => {
  const res = await db.removeMember(id)
  mainWindow?.webContents?.send('data:changed', { scope: 'members', action: 'remove', id })
  return res
})

// IPC: Attendance
ipcMain.handle('attendance:log', async (_e, memberId, type, at) => {
  const res = await db.logAttendance(memberId, type, at)
  mainWindow?.webContents?.send('data:changed', { scope: 'attendance', action: 'log', memberId })
  return res
})
ipcMain.handle('attendance:list', async (_e, memberId) => db.getAttendance(memberId))
ipcMain.handle('attendance:listAll', async () => db.getAllAttendance())

// IPC: Finance
ipcMain.handle('finance:payment:add', async (_e, payment) => {
  const res = await db.addPayment(payment)
  mainWindow?.webContents?.send('data:changed', { scope: 'finance', action: 'payment:add', id: res?.id })
  return res
})
ipcMain.handle('finance:payment:list', async (_e, memberId) => db.getPayments(memberId))
ipcMain.handle('finance:invoices:list', async () => db.getInvoices())

// IPC: Chat (memory & logs)
ipcMain.handle('chat:memory:add', async (_e, entry) => {
  try {
    const res = await db.addChatMemory(entry)
    mainWindow?.webContents?.send('data:changed', { scope: 'chat', action: 'memory:add', id: res?.id })
    return res
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  }
})
ipcMain.handle('chat:memory:list', async () => db.getChatMemory())
ipcMain.handle('chat:log:add', async (_e, log) => {
  try {
    const res = await db.addChatLog(log)
    return res
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  }
})

// IPC: Chat LLM completion
ipcMain.handle('chat:lm:complete', async (_e, payload) => {
  try {
    if (!llm?.complete) throw new Error('LLM ماژول در دسترس نیست')
    const res = await llm.complete(payload || {})
    return res
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  }
})

// IPC: Data Cleanup
ipcMain.handle('data:cleanup', async () => {
  try {
    const orphanRes = await db.cleanupOrphanedData()
    const emailRes = await db.cleanupEmailField()
    const res = { ...orphanRes, ...emailRes }
    mainWindow?.webContents?.send('data:changed', { scope: 'cleanup', action: 'run', at: Date.now() })
    return res
  } catch (error) {
    log.error('[IPC] data:cleanup failed', error)
    return { ok: false, error: String(error?.message || error) }
  }
})

// IPC: Data Wipe (dangerous - deletes all data)
ipcMain.handle('data:wipe', async () => {
  try {
    const res = await db.wipeAllData()
    mainWindow?.webContents?.send('data:changed', { scope: 'wipe', action: 'run', at: Date.now() })
    return res
  } catch (error) {
    log.error('[IPC] data:wipe failed', error)
    return { ok: false, error: String(error?.message || error) }
  }
})

// IPC: Backup database to a chosen JSON file
ipcMain.handle('maintenance:backup', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'پشتیبان‌گیری از پایگاه داده',
      defaultPath: 'gym-handler-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    const res = await db.backupTo(filePath)
    return res
  } catch (error) {
    log.error('[IPC] maintenance:backup failed', error)
    return { ok: false, error: String(error?.message || error) }
  }
})

// IPC: Restore database from a selected JSON file
ipcMain.handle('maintenance:restore', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow()
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'بازیابی پایگاه داده',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePaths?.[0]) return { canceled: true }
    const res = await db.restoreFrom(filePaths[0])
    mainWindow?.webContents?.send('data:changed', { scope: 'restore', action: 'run', at: Date.now() })
    return res
  } catch (error) {
    log.error('[IPC] maintenance:restore failed', error)
    return { ok: false, error: String(error?.message || error) }
  }
})

// IPC: Export invoices to CSV
ipcMain.handle('reports:exportInvoicesCsv', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'خروجی CSV فاکتورها',
      defaultPath: 'invoices.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    const invoices = await db.getInvoices()
    const headers = ['id','memberId','amount','currency','date','notes','createdAt']
    const escape = (v) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const head = headers.join(',')
    const body = invoices.map(r => headers.map(h => escape(r[h])).join(',')).join('\n')
    const csv = head + '\n' + body
    const fs = require('fs')
    fs.writeFileSync(filePath, csv, 'utf-8')
    return { ok: true, filePath }
  } catch (error) {
    log.error('[IPC] reports:exportInvoicesCsv failed', error)
    return { ok: false, error: String(error?.message || error) }
  }
})

// IPC: Export invoices to PDF (simple table)
ipcMain.handle('reports:exportInvoicesPdf', async () => {
  let tmpWin
  try {
    const win = BrowserWindow.getFocusedWindow()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'خروجی PDF فاکتورها',
      defaultPath: 'invoices.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    const invoices = await db.getInvoices()
    // تلاش برای جاسازی فونت IRANSans از مسیر محلی اگر وجود داشته باشد
    const fs = require('fs')
    const path = require('path')
    const appPath = process?.resourcesPath || path.dirname(__dirname)
    const fontsDir = path.join(appPath, 'electron', 'fonts')
    let fontFaceEmbedded = ''
    try {
      const regularPath = path.join(fontsDir, 'IRANSans-Regular.woff2')
      if (fs.existsSync(regularPath)) {
        const fontBase64 = fs.readFileSync(regularPath).toString('base64')
        fontFaceEmbedded = `@font-face{font-family:"IRANSans";font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${fontBase64}) format('woff2');}`
      }
    } catch {}
    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><style>
      ${fontFaceEmbedded}
      /* تلاش برای استفاده از فونت‌های نصب‌شده IRANSans/IRANSansX در سیستم */
      @font-face {
        font-family: "IRANSans";
        src: local("IRANSans"), local("IRANSans(FaNum)"), local("IRANSans Medium"), local("IRANSansX"), local("IRANSansX FaNum");
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: "IRANSans";
        src: local("IRANSans Bold"), local("IRANSansX Bold");
        font-weight: 700;
        font-style: normal;
      }
      body{font-family:"IRANSans","IRANSansX","Vazirmatn","Tahoma","Segoe UI",sans-serif;padding:24px;background:#fff;color:#000}
      h1{font-size:18px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #999;padding:6px;text-align:right;font-size:12px}
      thead{background:#eee}
    </style></head><body>
      <h1>گزارش فاکتورها</h1>
      <table><thead><tr><th>شناسه</th><th>عضو</th><th>مبلغ</th><th>واحد</th><th>تاریخ</th><th>توضیحات</th></tr></thead>
      <tbody>
        ${invoices.map(i => `<tr><td>${i.id||''}</td><td>${i.memberId||''}</td><td>${i.amount||''}</td><td>${i.currency||''}</td><td>${i.date||new Date(i.createdAt||Date.now()).toLocaleString('fa-IR')}</td><td>${i.notes||i.note||''}</td></tr>`).join('')}
      </tbody></table>
    </body></html>`
    tmpWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    await tmpWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    const pdfData = await tmpWin.webContents.printToPDF({
      landscape: false,
      marginsType: 1,
      pageSize: 'A4',
      printBackground: true,
    })
    fs.writeFileSync(filePath, pdfData)
    return { ok: true, filePath }
  } catch (error) {
    log.error('[IPC] reports:exportInvoicesPdf failed', error)
    return { ok: false, error: String(error?.message || error) }
  } finally {
    try { tmpWin?.destroy() } catch {}
  }
})

// IPC: Print (stubs)
ipcMain.handle('print:membershipCard', async (_e, memberId) => {
  const member = await db.getMember(memberId)
  if (!member) return { ok: false, error: 'عضو یافت نشد' }
  // Stub: در نسخه‌های بعدی با قالب حرفه‌ای چاپ می‌شود
  return { ok: true, message: 'درخواست چاپ کارت عضویت ثبت شد.' }
})

ipcMain.handle('print:paymentReceipt', async (_e, paymentId) => {
  // Stub: در نسخه‌های بعدی چاپ رسید واقعی افزوده می‌شود
  return { ok: true, message: 'درخواست چاپ رسید پرداخت ثبت شد.' }
})

// IPC: Telemetry capture (optional)
ipcMain.handle('telemetry:capture', async (_e, payload) => {
  try {
    const level = payload?.level || 'info'
    const msg = payload?.message || 'event'
    const extra = payload?.extra || {}
    if (Sentry?.captureMessage) {
      Sentry.captureMessage(msg, { level, extra })
    }
    log[level === 'error' ? 'error' : 'info']('[Telemetry] event', msg)
    return { ok: true }
  } catch (error) {
    log.error('[IPC] telemetry:capture failed', error)
    return { ok: false, error: String(error?.message || error) }
  }
})

// IPC: Export invoices to Excel (XLSX)
ipcMain.handle('reports:exportInvoicesExcel', async () => {
  try {
    if (!XLSX) throw new Error('کتابخانه اکسل نصب نشده است')
    const win = BrowserWindow.getFocusedWindow()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'خروجی Excel فاکتورها',
      defaultPath: 'invoices.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    const invoices = await db.getInvoices()
    const rows = (invoices || []).map(i => ({
      id: i.id || '',
      memberId: i.memberId || '',
      amount: Number(i.amount) || 0,
      currency: i.currency || 'IRR',
      date: i.date || new Date(i.createdAt || Date.now()).toLocaleString('fa-IR'),
      notes: i.notes || i.note || '',
      createdAt: i.createdAt || Date.now(),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices')
    XLSX.writeFile(wb, filePath)
    return { ok: true, filePath }
  } catch (error) {
    log.error('[IPC] reports:exportInvoicesExcel failed', error)
    return { ok: false, error: String(error?.message || error) }
  }
})
// Configure log rotation and formatting
try {
  log.transports.file.level = 'info'
  log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB
  log.transports.file.archive = true
  log.transports.console.level = isDev ? 'debug' : 'warn'
} catch {}

// Initialize Sentry telemetry if DSN provided
try {
  const dsn = process.env.SENTRY_DSN
  if (dsn && Sentry?.init) {
    Sentry.init({
      dsn,
      release: app.getVersion?.() || '0.0.0',
      environment: isDev ? 'development' : 'production',
      tracesSampleRate: 0.1,
      autoSessionTracking: true,
    })
    log.info('[Telemetry] Sentry initialized')
  }
} catch (error) {
  log.warn('[Telemetry] Sentry init failed', error)
}

// Crash/error capture
process.on('uncaughtException', (error) => {
  try { log.error('[Process] uncaughtException', error) } catch {}
  try { Sentry?.captureException?.(error) } catch {}
})
process.on('unhandledRejection', (reason) => {
  try { log.error('[Process] unhandledRejection', reason) } catch {}
  try { Sentry?.captureException?.(reason instanceof Error ? reason : new Error(String(reason))) } catch {}
})