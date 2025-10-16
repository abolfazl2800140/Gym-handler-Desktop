import { useState, useEffect, lazy, Suspense } from "react";
import { notifyError, notifySuccess } from "../utils/notify";
import ReportsHeader from "../components/organisms/ReportsHeader";
import FilterBar from "../components/molecules/FilterBar";
import type { ReportsFilters } from "../components/molecules/FilterBar";
import MonthSwitcher from "../components/molecules/MonthSwitcher";
const KPIGrid = lazy(() => import("../components/organisms/KPIGrid"));
const TrendsSection = lazy(() => import("../components/organisms/TrendsSection"));
const PaymentsTableSection = lazy(() => import("../components/organisms/PaymentsTableSection"));
const AttendanceSection = lazy(() => import("../components/organisms/AttendanceSection"));
const DailyReportsSection = lazy(() => import("../components/organisms/DailyReportsSection"));

interface DayValue { year: number; month: number; day: number }
type Range = { from: DayValue | null; to: DayValue | null };

export default function ReportsPage() {
  const initialRange: Range = { from: null, to: null };
  const [filters, setFilters] = useState<ReportsFilters>({
    range: initialRange,
    membershipStatus: "",
    level: "",
    paymentStatus: "",
    classId: "",
    coachId: "",
    packageType: "",
  } as any);

  // اضافه: KPIهای داینامیک
  const [kpis, setKpis] = useState<Array<{ label: string; value: string | number; change?: number; hint?: string }>>([
    { label: "اعضای فعال", value: "-", hint: "لحظه‌ای" },
    { label: "درآمد ماهانه", value: "-", hint: "جمع ماه جاری" },
    { label: "حضور امروز", value: "-", hint: "نسبت اعضای حاضر" },
    { label: "پرداخت‌های هفتگی", value: "-", hint: "جمع کل هفته" },
  ]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [cleaning, setCleaning] = useState(false);
  const [cleanupFeedback, setCleanupFeedback] = useState<string | null>(null);

  // ماه انتخابی برای گزارش روزانه
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // محاسبه بازه امروز
  const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  };

  // محاسبه بازه ماه جاری
  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  };

  // اضافه: تابع ریفرش KPIها
  async function refreshKpis() {
    const api = window.api;
    if (!api) return;

    const members = await api.members.list();
    const activeMembers = (members || []).filter((m) => (m.status ?? "active") === "active");
    const activeCount = activeMembers.length;

    const paymentsAll = await api.finance.listPayments();
    const payments = (paymentsAll || []).filter((p) => activeMembers.some((m) => m.id === p.memberId));
    const { start: monthStart, end: monthEnd } = getCurrentMonthRange();
    const monthPayments = payments.filter((p) => p.createdAt >= monthStart && p.createdAt <= monthEnd);
    const monthRevenue = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    // درآمد ماه قبل برای محاسبه تغییرات
    const prevMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();
    const prevMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999).getTime();
    const prevMonthPayments = payments.filter((p) => p.createdAt >= prevMonthStart && p.createdAt <= prevMonthEnd);
    const prevMonthRevenue = prevMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0,0,0,0);
    const weekPayments = payments.filter((p) => p.createdAt >= weekStart.getTime());
    const weekRevenue = weekPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    // درآمد هفته قبل
    const prevWeekStart = new Date(); prevWeekStart.setDate(prevWeekStart.getDate() - 13); prevWeekStart.setHours(0,0,0,0);
    const prevWeekEnd = new Date(); prevWeekEnd.setDate(prevWeekEnd.getDate() - 7); prevWeekEnd.setHours(23,59,59,999);
    const prevWeekPayments = payments.filter((p) => p.createdAt >= prevWeekStart.getTime() && p.createdAt <= prevWeekEnd.getTime());
    const prevWeekRevenue = prevWeekPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // حضور امروز: تعداد اعضایی که امروز حداقل یک لاگ دارند
    const attendanceAll = await api.attendance.listAll?.();
    const { start, end } = getTodayRange();
    const presentToday = (activeMembers || []).filter((m) => {
      const logs = (attendanceAll || []).filter((l) => l.memberId === m.id && l.at >= start && l.at <= end);
      return logs.length > 0;
    }).length;
    const attendanceRate = activeCount ? Math.round((presentToday / activeCount) * 100) : 0;
    // حضور دیروز برای تغییرات
    const yStart = new Date(); yStart.setDate(yStart.getDate() - 1); yStart.setHours(0,0,0,0);
    const yEnd = new Date(); yEnd.setDate(yEnd.getDate() - 1); yEnd.setHours(23,59,59,999);
    const presentYesterday = (activeMembers || []).filter((m) => {
      const logs = (attendanceAll || []).filter((l) => l.memberId === m.id && l.at >= yStart.getTime() && l.at <= yEnd.getTime());
      return logs.length > 0;
    }).length;
    const attendanceRateYesterday = activeCount ? Math.round((presentYesterday / activeCount) * 100) : 0;

    // اعضای فعال با حضور در 7 روز اخیر و هفته قبل
    const last7Start = new Date(); last7Start.setDate(last7Start.getDate() - 6); last7Start.setHours(0,0,0,0);
    const last7End = new Date(); last7End.setHours(23,59,59,999);
    const activeVisitedLast7 = (activeMembers || []).filter((m) => {
      const logs = (attendanceAll || []).filter((l) => l.memberId === m.id && l.at >= last7Start.getTime() && l.at <= last7End.getTime());
      return logs.length > 0;
    }).length;
    const prev7Start = new Date(); prev7Start.setDate(prev7Start.getDate() - 13); prev7Start.setHours(0,0,0,0);
    const prev7End = new Date(); prev7End.setDate(prev7End.getDate() - 7); prev7End.setHours(23,59,59,999);
    const activeVisitedPrev7 = (activeMembers || []).filter((m) => {
      const logs = (attendanceAll || []).filter((l) => l.memberId === m.id && l.at >= prev7Start.getTime() && l.at <= prev7End.getTime());
      return logs.length > 0;
    }).length;

    const pct = (cur: number, prev: number) => {
      if (!isFinite(cur) || !isFinite(prev) || prev === 0) return 0;
      return Math.round(((cur - prev) / Math.abs(prev)) * 100);
    };

    setKpis([
      { label: "اعضای فعال", value: activeCount, change: pct(activeVisitedLast7, activeVisitedPrev7), hint: `اعضای مراجعه‌کننده ۷ روز اخیر: ${activeVisitedLast7}؛ تغییر نسبت به هفته قبل: ${pct(activeVisitedLast7, activeVisitedPrev7)}%` },
      { label: "درآمد ماهانه", value: monthRevenue.toLocaleString("fa-IR"), change: pct(monthRevenue, prevMonthRevenue), hint: `تغییر نسبت به ماه قبل: ${pct(monthRevenue, prevMonthRevenue)}%` },
      { label: "حضور امروز", value: `${attendanceRate}%`, change: pct(attendanceRate, attendanceRateYesterday), hint: `دیروز: ${attendanceRateYesterday}%` },
      { label: "پرداخت‌های هفتگی", value: weekRevenue.toLocaleString("fa-IR"), change: pct(weekRevenue, prevWeekRevenue), hint: `تغییر نسبت به هفته قبل: ${pct(weekRevenue, prevWeekRevenue)}%` },
    ]);

    setSummaryText(`امروز: حضور ${attendanceRate}% — اعضای فعال ${activeCount} — درآمد ماه ${monthRevenue.toLocaleString("fa-IR")} تومان`);
  }

  // ریفرش اولیه + رویداد لحظه‌ای + تایمر دوره‌ای
  useEffect(() => {
    refreshKpis();
    const unsubscribe = window.api?.events?.subscribeDataChanged(() => refreshKpis());
    const interval = setInterval(refreshKpis, 10000); // هر ۱۰ ثانیه
    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, []);

  async function handleCleanup() {
    const maintenance = window.api?.maintenance;
    if (!maintenance?.cleanup) {
      setCleanupFeedback("اتصال به Electron برقرار نیست؛ پاک‌سازی فقط در نسخه دسکتاپ کار می‌کند.");
      return;
    }
    setCleaning(true);
    setCleanupFeedback(null);
    try {
      const res = await maintenance.cleanup();
      const removedPayments = res?.removedPayments ?? 0;
      const removedAttendance = res?.removedAttendance ?? 0;
      setCleanupFeedback(`پاک‌سازی انجام شد: حذف ${removedPayments} پرداخت و ${removedAttendance} لاگ حضور.`);
      // رفرش KPIها پس از پاکسازی
      refreshKpis();
    } catch (e) {
      setCleanupFeedback("خطا در پاک‌سازی داده");
      console.error('Cleanup failed', e);
    } finally {
      setCleaning(false);
    }
  }

  async function onExport(type: "csv" | "excel" | "pdf" | "print") {
    if (type === "print") {
      window.print();
      return;
    }
    const api = window.api?.finance;
    if (!api) {
      notifyError("اتصال Electron برقرار نیست؛ خروجی فقط در نسخه دسکتاپ.");
      return;
    }
    try {
      if (type === "csv") {
        const res = await api.exportInvoicesCsv();
        if (res?.canceled) return;
        if (res?.ok === false) { notifyError(res?.error || "خروجی CSV ناموفق بود"); return; }
        notifySuccess("خروجی CSV با موفقیت ذخیره شد");
      } else if (type === "pdf") {
        const res = await api.exportInvoicesPdf();
        if (res?.canceled) return;
        if (res?.ok === false) { notifyError(res?.error || "خروجی PDF ناموفق بود"); return; }
        notifySuccess("فایل PDF با موفقیت ذخیره شد");
      } else if (type === "excel") {
        const res = await api.exportInvoicesExcel();
        if (res?.canceled) return;
        if (res?.ok === false) { notifyError(res?.error || "خروجی Excel ناموفق بود"); return; }
        notifySuccess("فایل Excel با موفقیت ذخیره شد");
      }
    } catch (e: any) {
      notifyError(e?.message || "عملیات خروجی ناموفق بود");
    }
  }

  return (
    <div className="space-y-6">
      <ReportsHeader onExport={onExport} summaryText={summaryText} />
      {/* سوئیچ ماه کاربرپسند با فرمت فارسی */}
      <MonthSwitcher value={selectedMonth} onChange={setSelectedMonth} />
      <FilterBar
        value={filters}
        onChange={(v) => setFilters(v)}
        onReset={() => setFilters({
          range: initialRange,
          membershipStatus: "",
          level: "",
          paymentStatus: "",
          classId: "",
          coachId: "",
          packageType: "",
        } as any)}
      />
      <div className="flex items-center justify-between">
        <Suspense fallback={<div className="text-sm text-gray-600 dark:text-gray-400">در حال بارگذاری شاخص‌ها...</div>}>
          <KPIGrid items={kpis} />
        </Suspense>
        <button onClick={handleCleanup} className="btn btn-secondary" disabled={cleaning}>{cleaning ? "در حال پاک‌سازی..." : "پاک‌سازی داده"}</button>
      </div>
      {cleanupFeedback && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {cleanupFeedback}
        </div>
      )}
      {/* گزارش روزانه حضور با محور تاریخ فارسی و تعاملات */}
      <Suspense fallback={<div className="text-sm text-gray-600 dark:text-gray-400">در حال بارگذاری گزارش روزانه...</div>}>
        <DailyReportsSection month={selectedMonth} />
      </Suspense>
      <Suspense fallback={<div className="text-sm text-gray-600 dark:text-gray-400">در حال بارگذاری روندها...</div>}>
        <TrendsSection filters={filters} />
      </Suspense>
      <Suspense fallback={<div className="text-sm text-gray-600 dark:text-gray-400">در حال بارگذاری جدول پرداخت‌ها...</div>}>
        <PaymentsTableSection filters={filters} />
      </Suspense>
      <Suspense fallback={<div className="text-sm text-gray-600 dark:text-gray-400">در حال بارگذاری حضور و غیاب...</div>}>
        <AttendanceSection />
      </Suspense>
    </div>
  );
}