declare global {
  interface Window {
    api?: {
      members: {
        list: () => Promise<any[]>
        get: (id: string) => Promise<any>;
        create: (payload: any) => Promise<any>;
        update: (id: string, payload: any) => Promise<any>;
        remove: (id: string) => Promise<any>;
      }
      attendance: {
        log: (memberId: string, type: string, at?: number) => Promise<any>;
        list: (memberId?: string) => Promise<any[]>;
        listAll: () => Promise<any[]>;
      }
      finance: {
        addPayment: (payment: any) => Promise<any>;
        listPayments: (memberId?: string) => Promise<any[]>;
        listInvoices: () => Promise<any[]>;
        exportInvoicesCsv: () => Promise<any>;
        exportInvoicesPdf: () => Promise<any>;
        exportInvoicesExcel: () => Promise<any>;
      }
      chat: {
        addMemory: (entry: { pattern?: string; intent?: string; answer?: string }) => Promise<any>;
        listMemory: () => Promise<any[]>;
        addLog: (log: { user?: string; message: string; reply?: string; memoryId?: string | null }) => Promise<any>;
        complete: (payload: { messages: { role: 'user'|'assistant'|'system'; content: string }[]; maxTokens?: number; temperature?: number; system?: string }) => Promise<{ ok: boolean; text?: string; error?: string }>;
      }
      maintenance: {
        cleanup: () => Promise<any>;
        wipe: () => Promise<any>;
        backup: () => Promise<any>;
        restore: () => Promise<any>;
      }
      print: {
        membershipCard: (memberId: string) => Promise<any>;
        paymentReceipt: (paymentId: string) => Promise<any>;
      }
      events: {
        subscribeDataChanged: (cb: (payload: { scope: string; at?: number }) => void) => () => void;
      }
      telemetry: {
        capture: (payload: { level?: 'info' | 'warning' | 'error'; message?: string; extra?: any }) => Promise<any>;
      }
    }
  }
}

export {}