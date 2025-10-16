const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  members: {
    list: () => ipcRenderer.invoke('members:list'),
    get: (id) => ipcRenderer.invoke('members:get', id),
    create: (payload) => ipcRenderer.invoke('members:create', payload),
    update: (id, payload) => ipcRenderer.invoke('members:update', id, payload),
    remove: (id) => ipcRenderer.invoke('members:remove', id),
  },
  attendance: {
    log: (memberId, type, at) => ipcRenderer.invoke('attendance:log', memberId, type, at),
    list: (memberId) => ipcRenderer.invoke('attendance:list', memberId),
    listAll: () => ipcRenderer.invoke('attendance:listAll'),
  },
  finance: {
    addPayment: (payment) => ipcRenderer.invoke('finance:payment:add', payment),
    listPayments: (memberId) => ipcRenderer.invoke('finance:payment:list', memberId),
    listInvoices: () => ipcRenderer.invoke('finance:invoices:list'),
    exportInvoicesCsv: () => ipcRenderer.invoke('reports:exportInvoicesCsv'),
    exportInvoicesPdf: () => ipcRenderer.invoke('reports:exportInvoicesPdf'),
    exportInvoicesExcel: () => ipcRenderer.invoke('reports:exportInvoicesExcel'),
  },
  chat: {
    addMemory: (entry) => ipcRenderer.invoke('chat:memory:add', entry),
    listMemory: () => ipcRenderer.invoke('chat:memory:list'),
    addLog: (log) => ipcRenderer.invoke('chat:log:add', log),
    complete: (payload) => ipcRenderer.invoke('chat:lm:complete', payload),
  },
  maintenance: {
    cleanup: () => ipcRenderer.invoke('data:cleanup'),
    wipe: () => ipcRenderer.invoke('data:wipe'),
    backup: () => ipcRenderer.invoke('maintenance:backup'),
    restore: () => ipcRenderer.invoke('maintenance:restore'),
  },
  print: {
    membershipCard: (memberId) => ipcRenderer.invoke('print:membershipCard', memberId),
    paymentReceipt: (paymentId) => ipcRenderer.invoke('print:paymentReceipt', paymentId),
  },
  events: {
    subscribeDataChanged: (handler) => {
      const listener = (_event, payload) => {
        try { handler?.(payload) } catch {}
      }
      ipcRenderer.on('data:changed', listener)
      return () => ipcRenderer.removeListener('data:changed', listener)
    },
  },
  telemetry: {
    capture: (payload) => ipcRenderer.invoke('telemetry:capture', payload),
  },
})