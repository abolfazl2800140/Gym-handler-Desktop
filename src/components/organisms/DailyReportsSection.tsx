import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Brush, ReferenceLine } from "recharts";

function faDayLabel(ts: number) {
  const d = new Date(ts);
  return new Intl.DateTimeFormat("fa-IR", { day: "2-digit", month: "short" }).format(d);
}

export default function DailyReportsSection({ month }: { month: Date }) {
  const [data, setData] = useState<Array<{ ts: number; count: number }>>([]);
  const [selectedDayTs, setSelectedDayTs] = useState<number | null>(null);

  useEffect(() => {
    const api = window.api;
    if (!api) return;
    (async () => {
      const attendance = await api.attendance.listAll?.();
      const members = await api.members.list?.();
      const activeMembers = (members || []).filter((m) => (m.status ?? "active") === "active");
      const activeCount = activeMembers.length || 1;

      const days: number[] = [];
      const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const s = new Date(month.getFullYear(), month.getMonth(), i, 0, 0, 0, 0).getTime();
        days.push(s);
      }
      const perDay = days.map((s) => {
        const e = s + (24 * 60 * 60 * 1000) - 1;
        const presentMembers = activeMembers.filter((m) => {
          const logs = (attendance || []).filter((l) => l.memberId === m.id && l.at >= s && l.at <= e);
          return logs.length > 0;
        }).length;
        const rate = Math.round((presentMembers / activeCount) * 100);
        return { ts: s, count: rate };
      });
      setData(perDay);
      setSelectedDayTs(null);
    })();
  }, [month]);

  const chartData = useMemo(() => data.map((d, idx) => ({ idx, ts: d.ts, count: d.count, label: faDayLabel(d.ts) })), [data]);
  const yMax = Math.max(...data.map((d) => d.count), 1);
  const avg = data.length ? Math.round(data.reduce((s, d) => s + d.count, 0) / data.length) : 0;
  const best = data.reduce((acc, d) => d.count > acc.count ? d : acc, { ts: 0, count: 0 });
  const worst = data.reduce((acc, d) => (acc.ts === 0 || d.count < acc.count) ? d : acc, { ts: 0, count: Infinity as any });
  const selected = selectedDayTs ? data.find((d) => d.ts === selectedDayTs) : null;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-heading-3">گزارش روزانه حضور</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {data.length > 0 ? (
            <>
              میانگین ماه: {avg}% — بهترین روز: {best.ts ? faDayLabel(best.ts) : "-"} ({best.count}%) — ضعیف‌ترین روز: {worst.ts ? faDayLabel(worst.ts) : "-"} ({worst.count}%)
            </>
          ) : (
            "بدون داده"
          )}
        </div>
      </div>
      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, yMax]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v}%`, "نرخ حضور"]} labelFormatter={(l) => `روز ${l}`} />
            <Line type="monotone" dataKey="count" stroke="rgb(29,78,216)" strokeWidth={2} dot={false} />
            {avg > 0 && <ReferenceLine y={avg} stroke="rgb(16,185,129)" strokeDasharray="4 2" label={{ value: `میانگین ${avg}%`, position: "right", fill: "rgb(16,185,129)", fontSize: 12 }} />}
            <Brush dataKey="label" travellerWidth={8} height={24} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-sm">
        <label className="mr-2">انتخاب روز:</label>
        <select className="input" value={selectedDayTs ?? ""} onChange={(e) => setSelectedDayTs(e.target.value ? Number(e.target.value) : null)}>
          <option value="">— همه —</option>
          {data.map((d) => (
            <option key={d.ts} value={d.ts}>{faDayLabel(d.ts)}</option>
          ))}
        </select>
        {selected && (
          <span className="ml-3">نرخ حضور انتخاب‌شده: {selected.count}%</span>
        )}
      </div>
    </div>
  );
}