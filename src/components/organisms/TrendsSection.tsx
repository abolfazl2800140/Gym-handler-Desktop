import { useEffect, useMemo, useState } from "react";
import ChartCard from "../molecules/ChartCard";
import type { ReportsFilters } from "../molecules/FilterBar";

type Point = [number, number];

function normalizeCountsToPoints(counts: number[], yMax: number): Point[] {
  // 8 نقطه در محدوده x: 5 تا 90، y معکوس 5..35
  const xs = [5, 18, 30, 42, 54, 66, 78, 90];
  const ys = counts.map((c) => {
    const ratio = yMax ? Math.min(1, c / yMax) : 0;
    const y = 35 - 30 * ratio;
    return Math.round(y);
  });
  return xs.map((x, i) => [x, ys[i] ?? 35]);
}

export default function TrendsSection({ filters }: { filters?: ReportsFilters }) {
  const [activeMembersCounts, setActiveMembersCounts] = useState<number[]>(Array(8).fill(0));
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>(Array(8).fill(0));
  const [classCapacityUsage, setClassCapacityUsage] = useState<number[]>(Array(8).fill(0));
  const [showArea, setShowArea] = useState(true);

  async function refresh() {
    const api = window.api;
    if (!api) return;
    const members = await api.members.list();
    const paymentsAll = await api.finance.listPayments();
    const payments = (paymentsAll || []).filter((p) => (members || []).some((m) => m.id === p.memberId));
    const attendanceAll = await api.attendance.listAll?.();

    // روند اعضای فعال در 8 روز اخیر بر اساس وضعیت عضو (فعال) و آخرین حضور
    // تعریف: اعضای فعال = اعضایی که status آنها active است
    // برای هر روز، تعداد اعضای active را محاسبه می‌کنیم
    let activeMembers = (members || []).filter((m) => (m.status ?? "active") === "active");
    if (filters?.membershipStatus) {
      activeMembers = activeMembers.filter((m) => (m.status ?? "active") === filters.membershipStatus);
    }
    if (filters?.level) {
      activeMembers = activeMembers.filter((m) => (m.level ?? "") === filters.level);
    }
    const activeCount = activeMembers.length;
    const daysActive: number[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      daysActive.push(d.getTime());
    }
    const activeTrend = daysActive.map((dayStart) => {
      const end = dayStart + (24 * 60 * 60 * 1000) - 1;
      // تعداد اعضای فعال که در این روز لاگ حضور دارند (نمایانگر فعال بودن و مراجعه)
      const presentActiveMembers = activeMembers.filter((m) => {
        const logs = (attendanceAll || []).filter((l) => l.memberId === m.id && l.at >= dayStart && l.at <= end);
        return logs.length > 0;
      }).length;
      return presentActiveMembers;
    });

    // درآمد ماهانه در 8 ماه اخیر
    const now = new Date();
    const months: { year: number; month: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    const monthly = months.map(({ year, month }) => {
      const start = new Date(year, month, 1).getTime();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
      const rows = payments.filter((p) => p.createdAt >= start && p.createdAt <= end);
      return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    });

    // ظرفیت و حضور کلاس‌ها (فعلاً جایگزین: نرخ حضور روزانه اخیر نسبت به تعداد اعضای فعال)
    // اگر attendanceAll موجود باشد، نرخ حضور 8 روز اخیر را می‌سازیم
    // آماده‌سازی روزهای اخیر برای نرخ حضور
    const daysPresence: number[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      daysPresence.push(d.getTime());
    }
    const dailyPresenceRate = daysPresence.map((dayStart) => {
      const start = dayStart;
      const end = dayStart + (24 * 60 * 60 * 1000) - 1;
      const presentMembers = (activeMembers || []).filter((m) => {
        const logs = attendanceAll?.filter((l) => l.memberId === m.id && l.at >= start && l.at <= end) || [];
        return logs.length > 0;
      }).length;
      const rate = activeCount ? Math.round((presentMembers / activeCount) * 100) : 0;
      return rate;
    });

    setActiveMembersCounts(activeTrend);
    setMonthlyRevenue(monthly);
    setClassCapacityUsage(dailyPresenceRate);
  }

  useEffect(() => {
    refresh();
    const unsub = window.api?.events?.subscribeDataChanged?.(() => refresh());
    const it = setInterval(refresh, 20000);
    return () => { unsub?.(); clearInterval(it); };
  }, []);

  const activePoints = useMemo(() => normalizeCountsToPoints(activeMembersCounts, Math.max(...activeMembersCounts, 1)), [activeMembersCounts]);
  const revenuePoints = useMemo(() => normalizeCountsToPoints(monthlyRevenue, Math.max(...monthlyRevenue, 1)), [monthlyRevenue]);
  const capacityPoints = useMemo(() => normalizeCountsToPoints(classCapacityUsage, 100), [classCapacityUsage]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        title="روند اعضای فعال"
        description="تعداد فعال/غیرفعال در طول زمان"
        points={activePoints}
        color="rgb(99,102,241)"
        showArea={showArea}
        action={(
          <button className="btn-secondary" onClick={() => setShowArea((v) => !v)}>
            {showArea ? "نمایش خط" : "نمایش ناحیه"}
          </button>
        )}
      />
      <ChartCard title="درآمد ماهانه" description="مقایسه درآمد ماه‌ها" points={revenuePoints} color="rgb(16,185,129)" showArea={showArea} />
      <ChartCard title="ظرفیت و حضور کلاس‌ها" description="نرخ پرشدن کلاس‌ها" points={capacityPoints} color="rgb(234,88,12)" showArea={showArea} />
    </div>
  );
}