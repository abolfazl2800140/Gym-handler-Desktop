import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Point = [number, number];

function computePoints(values: number[], yMax: number): Point[] {
  const xs = [5, 18, 30, 42, 54, 66, 78];
  const ys = values.map((v) => {
    const ratio = yMax ? Math.min(1, v / yMax) : 0;
    return Math.round(35 - 30 * ratio);
  });
  return xs.map((x, i) => [x, ys[i] ?? 35]);
}

export default function AttendanceSection() {
  const [weekCounts, setWeekCounts] = useState<number[]>(Array(7).fill(0));
  const [topPerformers, setTopPerformers] = useState<{ name: string; count: number }[]>([]);

  async function refresh() {
    const api = window.api;
    if (!api) return;
    const members = await api.members.list();
    const existingIds = new Set<string>((members || []).map((m: any) => m.id));
    let logs = await api.attendance.listAll?.();
    // فیلتر رکوردهای نامعتبر
    logs = (logs || []).filter((l) => {
      const validType = l?.type === 'enter' || l?.type === 'exit';
      const validMember = typeof l?.memberId === 'string' && l.memberId.length > 0;
      const ts = Number(l?.at);
      const validAt = !!ts && isFinite(ts) && ts > 0;
      const memberExists = existingIds.has(l.memberId);
      return validType && validMember && validAt && memberExists;
    });

    // ۷ روز اخیر
    const starts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      starts.push(d.getTime());
    }
    const counts = starts.map((start) => {
      const end = start + 24 * 60 * 60 * 1000 - 1;
      return (logs || []).filter((l) => l.at >= start && l.at <= end && l.type === "enter").length;
    });

    // برترین‌ها: بیشترین ورود طی ۳۰ روز اخیر
    const from = (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d.getTime(); })();
    const to = (() => { const d = new Date(); d.setHours(23,59,59,999); return d.getTime(); })();
    const countsByMember: Record<string, number> = {};
    (logs || []).forEach((l) => {
      if (l.type === "enter" && l.at >= from && l.at <= to) {
        countsByMember[l.memberId] = (countsByMember[l.memberId] || 0) + 1;
      }
    });
    const top = Object.entries(countsByMember)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([memberId, count]) => {
        const m = members.find((mm) => mm.id === memberId);
        const name = m ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || (m.name ?? m.id) : memberId;
        return { name, count };
      });

    setWeekCounts(counts);
    setTopPerformers(top);
  }

  useEffect(() => {
    refresh();
    const unsub = window.api?.events?.subscribeDataChanged?.(() => refresh());
    const it = setInterval(refresh, 20000);
    return () => { unsub?.(); clearInterval(it); };
  }, []);

  const yMax = Math.max(...weekCounts, 1);
  const points = useMemo(() => computePoints(weekCounts, yMax), [weekCounts, yMax]);
  const chartData = points.map(([x,y], idx) => ({ idx, x, y }));

  return (
    <div className="card p-4">
      <h3 className="text-heading-3 mb-3">حضور و غیاب</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-h-[160px] rounded-md border border-white/10 bg-black/5 dark:bg-white/5 p-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">روند هفتگی حضور</div>
          <div className="w-full h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="idx" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, yMax]} />
                <Tooltip />
                <Line type="monotone" dataKey="y" stroke="rgb(16,185,129)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="min-h-[160px] rounded-md border border-white/10 bg-black/5 dark:bg-white/5 p-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">برترین‌ها</div>
          <ul className="space-y-2 text-sm">
            {topPerformers.length === 0 && (
              <li className="text-gray-500">داده‌ای برای بازه اخیر یافت نشد</li>
            )}
            {topPerformers.map((p, idx) => (
              <li key={idx} className="flex items-center justify-between"><span>{p.name}</span><span className="badge">{p.count} حضور</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}