export type ChatMemory = { id: string; pattern?: string; intent?: string; answer?: string };

// ساده: نیت‌های پایه برای حضور و مالی
const intentMatchers: { key: string; match: (text: string) => boolean }[] = [
  { key: 'attendance.today.absent', match: (t) => /کی|چه کسی|چه کسانی/.test(t) && /غایب|غیبت/.test(t) && /امروز|امروزه/.test(t) },
  { key: 'attendance.today.present.count', match: (t) => /تعداد/.test(t) && /حاضر|ورود/.test(t) && /امروز/.test(t) },
  { key: 'finance.lastMonth.status', match: (t) => /(وضعیت|مبلغ|پرداخت)/.test(t) && /(ماه قبل|ماه گذشته|ماه پیش)/.test(t) },
  { key: 'finance.member.payments', match: (t) => /(پرداخت(?:‌| )های?)/.test(t) && /(عضو|کاربر|مشتری)/.test(t) },
]

export function detectIntent(text: string, memory: ChatMemory[]): { intent?: string; memoryMatch?: ChatMemory } {
  const t = normalize(text)
  // memory pattern exact/contains match
  for (const m of memory) {
    const pat = normalize(m.pattern || '')
    if (pat && (t.includes(pat) || t === pat)) {
      return { intent: m.intent || undefined, memoryMatch: m }
    }
  }
  const found = intentMatchers.find((m) => m.match(t))
  return { intent: found?.key }
}

export function normalize(s: string) {
  return (s || '')
    .replace(/[\u200c\u200f\u200e]/g, '') // remove zwnj/lrm/rlm
    .replace(/[\s]+/g, ' ')
    .trim()
    .toLowerCase()
}

export function answerForIntent(intent: string, ctx: {
  members: any[]
  attendanceAll: any[]
  payments: any[]
}): string {
  switch (intent) {
    case 'attendance.today.absent': {
      const activeMembers = (ctx.members || []).filter((m) => m.status !== 'inactive')
      const { start, end } = todayRange()
      const absent = activeMembers.filter((m) => {
        const logs = (ctx.attendanceAll || []).filter((l) => l.memberId === m.id && l.at >= start && l.at <= end)
        return logs.length === 0
      })
      if (absent.length === 0) return 'امروز همه اعضای فعال حضور داشته‌اند.'
      const names = absent.map((m) => `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || (m.name ?? m.id))
      return `غایبین امروز: ${names.join('، ')}`
    }
    case 'attendance.today.present.count': {
      const activeMembers = (ctx.members || []).filter((m) => m.status !== 'inactive')
      const activeCount = activeMembers.length
      const { start, end } = todayRange()
      const present = activeMembers.filter((m) => {
        const logs = (ctx.attendanceAll || []).filter((l) => l.memberId === m.id && l.at >= start && l.at <= end)
        return logs.length > 0
      }).length
      return `تعداد حاضرین امروز ${present} نفر از ${activeCount} عضو فعال است.`
    }
    case 'finance.lastMonth.status': {
      const { start, end } = lastMonthRange()
      const rows = (ctx.payments || []).filter((p) => p.createdAt >= start && p.createdAt <= end)
      const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
      return `درآمد ماه گذشته: ${total.toLocaleString('fa-IR')} ریال از ${rows.length} پرداخت.`
    }
    default:
      return 'متوجه پرسش نشدم. لطفاً شفاف‌تر بیان کنید یا الگوی جدیدی بیفزایید.'
  }
}

function todayRange() {
  const s = new Date(); s.setHours(0,0,0,0)
  const e = new Date(); e.setHours(23,59,59,999)
  return { start: s.getTime(), end: e.getTime() }
}

function lastMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59,999).getTime()
  return { start, end }
}