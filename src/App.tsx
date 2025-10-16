import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Modal, Button, Toaster } from "./components";
import { ChatWidget } from "./components";
import { anim } from "./utils/anim";
import { DateInput, Dropdown, LevelDropdown } from "./components";
import {
  UserGroupIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

interface DayValue {
  year: number;
  month: number;
  day: number;
}

type TabKey = "members" | "attendance" | "finance" | "reports" | "settings";

const levelOptions = [
  { value: "basic", label: "عادی" },
  { value: "silver", label: "نقره‌ای" },
  { value: "gold", label: "طلایی" },
];

const roleOptions = [
  { value: "member", label: "عضو" },
  { value: "coach", label: "مربی" },
  { value: "admin", label: "مدیر" },
];

const statusOptions = [
  { value: "active", label: "فعال" },
  { value: "inactive", label: "غیرفعال" },
];

const sortByOptions = [
  { value: "createdAt", label: "مرتب‌سازی بر اساس تاریخ ثبت" },
  { value: "name", label: "مرتب‌سازی بر اساس نام" },
  { value: "phone", label: "مرتب‌سازی بر اساس شماره" },
  { value: "level", label: "مرتب‌سازی بر اساس سطح" },
  { value: "role", label: "مرتب‌سازی بر اساس نقش" },
  { value: "status", label: "مرتب‌سازی بر اساس وضعیت" },
];

const sortDirOptions = [
  { value: "asc", label: "صعودی" },
  { value: "desc", label: "نزولی" },
];




// Removed local Modal component; using atomic Modal from components/atoms

function colorFromSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const h = Math.abs(hash) % 360;
  const s = 65;
  const l = 45;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function App() {
  const [tab, setTab] = useState<TabKey>("members");
  const [members, setMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    level: "basic",
    role: "member",
    status: "active",
  });
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showMembersList, setShowMembersList] = useState(true);
  const [editMember, setEditMember] = useState<any>({
    name: "",
    phone: "",
    level: "basic",
    role: "member",
    status: "active",
  });
  // وضعیت تغییرات فرم ویرایش عضو برای غیرفعال‌کردن دکمه ذخیره
  const isEditDirty = useMemo(() => {
    if (!selectedMember) return false;
    return (
      (editMember.name || "") !== (selectedMember.name || "") ||
      (editMember.phone || "") !== (selectedMember.phone || "") ||
      (editMember.level || "basic") !== (selectedMember.level || "basic") ||
      (editMember.role || "member") !== (selectedMember.role || "member") ||
      (editMember.status || "active") !== (selectedMember.status || "active")
    );
  }, [editMember, selectedMember]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    role: "",
    status: "",
    level: "",
    createdFrom: null as DayValue | null,
    createdTo: null as DayValue | null,
    sortBy: "createdAt",
    sortDir: "desc" as "asc" | "desc",
  });
  const [filtersDraft, setFiltersDraft] = useState({
    q: "",
    role: "",
    status: "",
    level: "",
    createdFrom: null as DayValue | null,
    createdTo: null as DayValue | null,
    sortBy: "createdAt",
    sortDir: "desc" as "asc" | "desc",
  });

  // روی تغییر تب، اسکرول صفحه را ریست کن تا پرش اتفاق نیفتد
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "instant" as any });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [tab]);
  const apiAvailable = !!window.api?.members;

  // حضور و غیاب
  const [attendanceMemberId, setAttendanceMemberId] = useState<string | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // مالی
  const [financeMemberId, setFinanceMemberId] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState<{ amount: string; note: string }>({ amount: "", note: "" });
  const [financeLoading, setFinanceLoading] = useState(false);

  // مدیریت حالت روز/شب با کلاس `dark` روی ریشه سند
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // بارگذاری اعضا در شروع برنامه برای استفاده در همه تب‌ها
  useEffect(() => {
    if (window.api?.members) {
      window.api.members
        .list()
        .then(setMembers)
        .catch(() => setMembers([]));
    }
  }, []);

  useEffect(() => {
    if (tab === "members" && window.api?.members) {
      window.api.members
        .list()
        .then(setMembers)
        .catch(() => setMembers([]));
    }
  }, [tab]);

  useEffect(() => {
    const api = window.api?.members;
    if (!api) return;
    if (selectedMemberId) {
      api.get(selectedMemberId).then((m) => {
        setSelectedMember(m);
        if (m)
          setEditMember({
            name: m.name || "",
            phone: m.phone || "",
            level: m.level || "basic",
            role: m.role || "member",
            status: m.status || "active",
          });
      });
    } else {
      setSelectedMember(null);
    }
  }, [selectedMemberId]);

  // هماهنگ‌سازی نمایش لیست اعضا با انیمیشن خروج جزئیات
  useEffect(() => {
    if (selectedMemberId) {
      setShowMembersList(false);
    }
  }, [selectedMemberId]);

  // بارگذاری لاگ‌های حضور برای عضو انتخاب‌شده
  useEffect(() => {
    const api = window.api?.attendance;
    if (!api || !attendanceMemberId) {
      setAttendanceLogs([]);
      return;
    }
    setAttendanceLoading(true);
    api
      .list(attendanceMemberId)
      .then(setAttendanceLogs)
      .finally(() => setAttendanceLoading(false));
  }, [attendanceMemberId]);

  // بارگذاری پرداخت‌ها برای عضو انتخاب‌شده
  useEffect(() => {
    const api = window.api?.finance;
    if (!api) return;
    if (financeMemberId) {
      setFinanceLoading(true);
      api
        .listPayments(financeMemberId)
        .then(setPayments)
        .finally(() => setFinanceLoading(false));
    } else {
      setPayments([]);
    }
  }, [financeMemberId]);

  const formatDate = (ts?: number) => {
    if (!ts) return "-";
    try {
      const d = new Date(ts);
      // نمایش تاریخ شمسی با استفاده از تقویم Persian
      const datePart = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      const timePart = new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
      return `${datePart}، ${timePart}`;
    } catch {
      return String(ts);
    }
  };

  // محاسبه لیست فیلترشده داخل محدوده کامپوننت
  const filteredMembers = useMemo(() => {
    let arr = [...members];
    const { q, role, status, level, createdFrom, createdTo, sortBy, sortDir } =
      filters;
    const qn = q.trim();
    if (qn) {
      const qq = qn.toLowerCase();
      arr = arr.filter(
        (m) =>
          String(m.name || "")
            .toLowerCase()
            .includes(qq) ||
          String(m.phone || "")
            .toLowerCase()
            .includes(qq)
      );
    }
    if (role) arr = arr.filter((m) => String(m.role || "") === role);
    if (status) arr = arr.filter((m) => String(m.status || "") === status);
    if (level) arr = arr.filter((m) => String(m.level || "") === level);
    if (createdFrom) {
      const fromTs = new Date(
        createdFrom.year,
        createdFrom.month - 1,
        createdFrom.day
      ).getTime();
      if (!isNaN(fromTs))
        arr = arr.filter((m) => Number(m.createdAt || 0) >= fromTs);
    }
    if (createdTo) {
      const toTs = new Date(
        createdTo.year,
        createdTo.month - 1,
        createdTo.day,
        23,
        59,
        59
      ).getTime();
      if (!isNaN(toTs))
        arr = arr.filter((m) => Number(m.createdAt || 0) <= toTs);
    }
    const key = sortBy as keyof any;
    arr.sort((a: any, b: any) => {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), "fa", {
          sensitivity: "base",
          numeric: true,
        });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [members, filters]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Toaster />
      <ChatWidget />
      {/* Modern Header */}
      <header className="glass sticky top-0 z-40 border-b border-white/20 dark:border-gray-700/50 backdrop-blur-xl">
        <div className="container mx-auto">
          <div className="flex items-center justify-between py-6">
            {/* Enhanced Logo */}
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg hover-lift">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  مدیریت باشگاه
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">نسخه 2.0 - سیستم مدیریت پیشرفته</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="desktop-nav hidden md:flex items-center gap-2">
              {[
                {
                  key: "members",
                  label: "اعضا",
                  icon: (props: any) => <UserGroupIcon {...props} />,
                },
                {
                  key: "attendance",
                  label: "حضور و غیاب",
                  icon: (props: any) => <CalendarDaysIcon {...props} />,
                },
                {
                  key: "finance",
                  label: "مالی",
                  icon: (props: any) => <BanknotesIcon {...props} />,
                },
                {
                  key: "reports",
                  label: "گزارشات",
                  icon: (props: any) => <ChartBarIcon {...props} />,
                },
                {
                  key: "settings",
                  label: "تنظیمات",
                  icon: (props: any) => (
                    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0l.26.988a1.5 1.5 0 001.104 1.07l1.003.257c1.133.29 1.454 1.733.564 2.555l-.737.7a1.5 1.5 0 000 2.186l.737.7c.89.822.569 2.265-.564 2.555l-1.003.257a1.5 1.5 0 00-1.104 1.07l-.26.988c-.3 1.14-1.603 1.14-1.902 0l-.26-.988a1.5 1.5 0 00-1.104-1.07l-1.003-.257c-1.133-.29-1.454-1.733-.564-2.555l.737-.7a1.5 1.5 0 000-2.186l-.737-.7c-.89-.822-.569-2.265.564-2.555l1.003-.257a1.5 1.5 0 001.104-1.07l.26-.988z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
                    </svg>
                  ),
                },
              ].map((tabItem) => (
                <button
                  key={tabItem.key}
                  onClick={() => setTab(tabItem.key as any)}
                  className={`nav-tab touch-target px-4 py-2 font-medium transition-colors duration-200 flex items-center gap-2 text-responsive-sm tooltip ${
                    tab === tabItem.key ? "active" : "text-gray-700 dark:text-gray-300"
                  }`}
                  data-tooltip={tabItem.label}
                >
                  {typeof tabItem.icon === "function"
                    ? tabItem.icon({ className: "w-4 h-4" })
                    : null}
                  <span className="hidden lg:inline">{tabItem.label}</span>
                </button>
              ))}
            </nav>

            {/* Enhanced Theme Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="relative p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover-lift hover-glow"
                title={`تغییر به حالت ${theme === "light" ? "تاریک" : "روشن"}`}
              >
                <div className="relative w-6 h-6">
                  {theme === "light" ? (
                    <svg
                      className="w-6 h-6 text-gray-700 dark:text-gray-300 transition-all duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6 text-yellow-500 transition-all duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  )}
                </div>
              </button>
              
              {/* Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700 dark:text-green-300">آنلاین</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Mobile Navigation */}
      <nav className="mobile-nav flex justify-around items-center border-t border-white/20 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-lg">
        {[
          {
            key: "members",
            label: "اعضا",
            icon: (props: any) => <UserGroupIcon {...props} />,
          },
          {
            key: "attendance",
            label: "حضور",
            icon: (props: any) => <CalendarDaysIcon {...props} />,
          },
          {
            key: "finance",
            label: "مالی",
            icon: (props: any) => <BanknotesIcon {...props} />,
          },
          {
            key: "reports",
            label: "گزارش",
            icon: (props: any) => <ChartBarIcon {...props} />,
          },
          {
            key: "settings",
            label: "تنظیمات",
            icon: (props: any) => (
              <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0l.26.988a1.5 1.5 0 001.104 1.07l1.003.257c1.133.29 1.454 1.733.564 2.555l-.737.7a1.5 1.5 0 000 2.186l.737.7c.89.822.569 2.265-.564 2.555l-1.003.257a1.5 1.5 0 00-1.104 1.07l-.26.988c-.3 1.14-1.603 1.14-1.902 0l-.26-.988a1.5 1.5 0 00-1.104-1.07l-1.003-.257c-1.133-.29-1.454-1.733-.564-2.555l.737-.7a1.5 1.5 0 000-2.186l-.737-.7c-.89-.822-.569-2.265.564-2.555l1.003-.257a1.5 1.5 0 001.104-1.07l.26-.988z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
              </svg>
            ),
          },
        ].map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key as any)}
            className={`touch-target flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-300 ease-out relative ${
              tab === tabItem.key
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md transform scale-105"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            <div className={`transition-all duration-300 ${
              tab === tabItem.key ? "transform scale-110" : ""
            }`}>
              {typeof tabItem.icon === "function"
                ? tabItem.icon({ className: "w-5 h-5" })
                : null}
            </div>
            <span className={`text-xs font-medium transition-all duration-300 ${
              tab === tabItem.key ? "font-semibold" : ""
            }`}>{tabItem.label}</span>
            {tab === tabItem.key && (
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
            )}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="container mx-auto spacing-responsive">
        <AnimatePresence mode="wait">
          {tab === "members" && (
            <motion.section
              key="members"
              className="space-y-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: anim.durations.md, ease: anim.ease }}
              style={{ willChange: "transform, opacity" }}
            >
            {showMembersList && (
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  مدیریت اعضا
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                  مدیریت جامع و پیشرفته اطلاعات اعضای باشگاه
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setShowAddMemberModal(true)}
                  variant="primary"
                  className="flex items-center gap-2 hover-lift hover-glow"
                  title="افزودن عضو جدید"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span className="hidden sm:inline font-semibold">افزودن عضو جدید</span>
                  <span className="sm:hidden font-semibold">افزودن</span>
                </Button>
                <Button
                  onClick={() => {
                    setFiltersDraft(filters);
                    setShowFiltersModal(true);
                  }}
                  variant="secondary"
                  className="flex items-center gap-2"
                  title="فیلترها"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <span className="hidden sm:inline">فیلترها</span>
                  <span className="sm:hidden">فیلتر</span>
                </Button>
                <button
                  type="button"
                  aria-disabled="true"
                  className="btn-secondary cursor-default pointer-events-none flex items-center gap-2"
                  title="تعداد اعضا"
                >
                  <span>تعداد اعضا:</span>
                  <span className="">{filteredMembers.length}</span>
                </button>
              </div>
            </div>
            )}

            {!apiAvailable && (
              <div className="card p-4 border-l-4 border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      اتصال به Electron برقرار نیست
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      برای ثبت عضو، برنامه دسکتاپ را اجرا کنید:{" "}
                      <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded text-xs">
                        npm run dev:electron
                      </code>
                    </p>
                  </div>
                </div>
              </div>
            )}
            <form
              className="hidden"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newMember.name) return;
                const api = window.api?.members;
                if (!api) return;
                const created = await api.create(newMember);
                setMembers((prev) => [created, ...prev]);
                (await import("./utils/notify")).notifySuccess("عضو جدید با موفقیت اضافه شد");
                setNewMember({
                  name: "",
                  phone: "",
                  level: "basic",
                  role: "member",
                  status: "active",
                });
                setShowAddMemberModal(false);
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 className="text-heading-3">افزودن عضو جدید</h3>
              </div>

              <div className="responsive-grid">
                <div className="space-y-2">
                  <label className="text-responsive-sm font-medium text-gray-700 dark:text-gray-300">
                    نام و نام خانوادگی
                  </label>
                  <input
                    className="input w-full"
                    placeholder="مثال: علی محمدی"
                    value={newMember.name}
                    onChange={(e) =>
                      setNewMember({ ...newMember, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-responsive-sm font-medium text-gray-700 dark:text-gray-300">
                    شماره تماس
                  </label>
                  <input
                    className="input w-full"
                    placeholder="09123456789"
                    value={newMember.phone}
                    onChange={(e) =>
                      setNewMember({ ...newMember, phone: e.target.value })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-responsive-sm font-medium text-gray-700 dark:text-gray-300">
                    سطح عضویت
                  </label>
                  <Dropdown
                    options={levelOptions}
                    value={newMember.level}
                    onChange={(v) => setNewMember({ ...newMember, level: v })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-responsive-sm font-medium text-gray-700 dark:text-gray-300">
                    نقش
                  </label>
                  <Dropdown
                    options={roleOptions}
                    value={newMember.role}
                    onChange={(v) => setNewMember({ ...newMember, role: v })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-responsive-sm font-medium text-gray-700 dark:text-gray-300">
                    وضعیت
                  </label>
                  <Dropdown
                    options={statusOptions}
                    value={newMember.status}
                    onChange={(v) => setNewMember({ ...newMember, status: v })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 touch-target ripple"
                  disabled={!apiAvailable || !newMember.name}
                  title={
                    !apiAvailable
                      ? "این قابلیت فقط در نسخه Electron فعال است"
                      : ""
                  }
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  ثبت عضو جدید
                </button>
              </div>
            </form>

            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                !showMembersList ? "hidden" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-responsive-sm font-medium text-gray-700 dark:text-gray-300">
                  نمایش:
                </span>
                <div className="flex bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-gray-200 dark:border-white/20 shadow-sm gap-3">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`touch-target px-4 py-2 rounded-md text-responsive-sm font-medium transition-colors duration-300 ${
                      viewMode === "list"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 10h16M4 14h16M4 18h16"
                        />
                      </svg>
                      <span className="hidden sm:inline">لیست</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setViewMode("card")}
                    className={`touch-target px-4 py-2 rounded-md text-responsive-sm font-medium transition-colors duration-300 ${
                      viewMode === "card"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        />
                      </svg>
                      <span className="hidden sm:inline">کارت</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* نوار فیلتر پیشرفته (مخفی؛ استفاده از مدال) */}
            <motion.div
              className={"hidden"}
              initial={anim.slideUp.initial}
              animate={anim.slideUp.animate}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </div>
                <h3 className="text-heading-3">فیلترهای پیشرفته</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="slide-up">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    جستجو
                  </label>
                  <input
                    className="input w-full"
                    placeholder="جستجو نام یا شماره"
                    value={filters.q}
                    onChange={(e) =>
                      setFilters({ ...filters, q: e.target.value })
                    }
                  />
                </div>
                <div className="slide-up" style={{ animationDelay: "0.1s" }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نقش
                  </label>
                  <Dropdown
                    options={[
                      { value: "", label: "همه نقش‌ها" },
                      ...roleOptions,
                    ]}
                    value={filters.role}
                    onChange={(v) => setFilters({ ...filters, role: v })}
                  />
                </div>
                <div className="slide-up" style={{ animationDelay: "0.2s" }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    وضعیت
                  </label>
                  <Dropdown
                    options={[
                      { value: "", label: "همه وضعیت‌ها" },
                      ...statusOptions,
                    ]}
                    value={filters.status}
                    onChange={(v) => setFilters({ ...filters, status: v })}
                  />
                </div>
                <div className="slide-up" style={{ animationDelay: "0.3s" }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سطح
                  </label>
                  <Dropdown
                    options={[
                      { value: "", label: "همه سطوح" },
                      ...levelOptions,
                    ]}
                    value={filters.level}
                    onChange={(v) => setFilters({ ...filters, level: v })}
                  />
                </div>
                <div className="slide-up" style={{ animationDelay: "0.4s" }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    از تاریخ
                  </label>
                  <DateInput
                    placeholder="از تاریخ"
                    value={filters.createdFrom}
                    onChange={(v) => setFilters({ ...filters, createdFrom: v })}
                  />
                </div>
                <div className="slide-up" style={{ animationDelay: "0.5s" }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تا تاریخ
                  </label>
                  <DateInput
                    placeholder="تا تاریخ"
                    value={filters.createdTo}
                    onChange={(v) => setFilters({ ...filters, createdTo: v })}
                  />
                </div>
                <div className="slide-up" style={{ animationDelay: "0.6s" }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    مرتب‌سازی
                  </label>
                  <Dropdown
                    options={sortByOptions}
                    value={filters.sortBy}
                    onChange={(v) => setFilters({ ...filters, sortBy: v })}
                  />
                </div>
                <div className="slide-up" style={{ animationDelay: "0.7s" }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ترتیب
                  </label>
                  <Dropdown
                    options={sortDirOptions}
                    value={filters.sortDir}
                    onChange={(v) =>
                      setFilters({ ...filters, sortDir: v as "asc" | "desc" })
                    }
                  />
                </div>
                <div
                  className="slide-up flex items-end"
                  style={{ animationDelay: "0.8s" }}
                >
                  <button
                    type="button"
                    className="btn-secondary w-full transform hover:scale-105 transition-all duration-200 ripple"
                    onClick={() =>
                      setFilters({
                        q: "",
                        role: "",
                        status: "",
                        level: "",
                        createdFrom: null,
                        createdTo: null,
                        sortBy: "createdAt",
                        sortDir: "desc",
                      })
                    }
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      پاک کردن فیلترها
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>

            <AnimatePresence mode="wait" onExitComplete={() => setShowMembersList(true)}>
              {selectedMember && (
                <motion.div
                  className="rounded-lg border border-outline bg-black/5 dark:bg-white/5 p-6 space-y-6 shadow-sm"
                  initial={anim.slideUp.initial}
                  animate={anim.slideUp.animate}
                  exit={anim.slideUp.exit}
                  transition={{ duration: anim.durations.md, ease: anim.ease }}
                >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-full text-white flex items-center justify-center font-bold shadow-sm"
                      style={{
                        backgroundColor: colorFromSeed(
                          selectedMember.id || selectedMember.name || ""
                        ),
                      }}
                    >
                      {selectedMember.name?.[0] || "عضو"}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {selectedMember.name || "جزئیات عضو"}
                      </h2>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-700 dark:text-white/70">
                        <span className="badge">
                          نقش: {roleOptions.find((r) => r.value === editMember.role)?.label || "عضو"}
                        </span>
                        <span className="badge">
                          وضعیت: {statusOptions.find((s) => s.value === editMember.status)?.label || "فعال"}
                        </span>
                        <span className="badge">
                          سطح: {levelOptions.find((l) => l.value === editMember.level)?.label || "عادی"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-white/60">
                        <span className="rounded-md bg-white/5 px-2 py-1">
                          شناسه: <span className="font-mono">{selectedMember.id}</span>
                        </span>
                        <span className="rounded-md bg-white/5 px-2 py-1">
                          ایجاد: {formatDate(selectedMember.createdAt)}
                        </span>
                        <span className="rounded-md bg-white/5 px-2 py-1">
                          ویرایش: {formatDate(selectedMember.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary ripple"
                      disabled={!apiAvailable || !selectedMember || !isEditDirty}
                      onClick={async () => {
                        const api = window.api?.members;
                        if (!api || !selectedMember) return;
                        const updated = await api.update(
                          selectedMember.id,
                          editMember
                        );
                        if (updated) {
                          setSelectedMember(updated);
                          setMembers((prev) =>
                            prev.map((x) => (x.id === updated.id ? updated : x))
                          );
                          // اعلان موفقیت ذخیره
                          (await import("./utils/notify")).notifySuccess("تغییرات با موفقیت ذخیره شد");
                          // پس از ذخیره موفقیت‌آمیز، بازگشت به صفحه لیست اعضا
                          setSelectedMemberId(null);
                        }
                      }}
                    >
                      ذخیره تغییرات
                    </button>
                    <button
                      className="btn-secondary ripple"
                      onClick={() => setSelectedMemberId(null)}
                    >
                      بازگشت
                    </button>
                    <button
                      className="btn-secondary ripple"
                      onClick={async () => {
                        const api = window.api?.print;
                        if (!api || !selectedMember) return;
                        const resp = await api.membershipCard(selectedMember.id);
                        if (resp?.message) alert(resp.message);
                      }}
                    >
                      چاپ کارت عضویت
                    </button>
                    <button
                      className="btn-secondary ripple"
                      onClick={async () => {
                        const api = window.api?.members;
                        if (!api || !selectedMember) return;
                        await api.remove(selectedMember.id);
                        setMembers((prev) =>
                          prev.filter((x) => x.id !== selectedMember.id)
                        );
                        setSelectedMemberId(null);
                        (await import("./utils/notify")).notifySuccess("عضو با موفقیت حذف شد");
                      }}
                    >
                      حذف عضو
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">اطلاعات تماس</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-white/70">
                      نام
                    </label>
                    <input
                      className="input"
                      placeholder="مثلاً علی محمدی"
                      value={editMember.name}
                      onChange={(e) =>
                        setEditMember({ ...editMember, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-white/70">
                      شماره تماس
                    </label>
                    <input
                      className="input"
                      placeholder="0912xxxxxxx"
                      value={editMember.phone}
                      onChange={(e) =>
                        setEditMember({ ...editMember, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-white/70">
                      
                    </label>
                    <input
                      className="input"
                      style={{ display: "none" }}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">وضعیت عضویت</h3>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-white/70">
                      سطح عضویت
                    </label>
                    <Dropdown
                      options={levelOptions}
                      value={editMember.level}
                      size="lg"
                      onChange={(v) =>
                        setEditMember({ ...editMember, level: v })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-white/70">
                      نقش
                    </label>
                    <Dropdown
                      options={roleOptions}
                      value={editMember.role}
                      size="lg"
                      onChange={(v) =>
                        setEditMember({ ...editMember, role: v })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-white/70">
                      وضعیت حساب
                    </label>
                    <Dropdown
                      options={statusOptions}
                      value={editMember.status}
                      size="lg"
                      onChange={(v) =>
                        setEditMember({ ...editMember, status: v })
                      }
                    />
                  </div>
                </div>

                

                
                </motion.div>
              )}
            </AnimatePresence>

            {viewMode === "card" && showMembersList && (
              <motion.div 
                className="responsive-grid mt-6 sm:mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, staggerChildren: 0.1 }}
              >
                {filteredMembers.map((m, index) => (
                  <motion.div
                    key={m.id}
                    className="group relative cursor-pointer card card-elevated p-6 hover-lift hover-glow"
                    style={{ willChange: "transform", transformOrigin: "center" }}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      duration: 0.5, 
                      delay: index * 0.1,
                      stiffness: 100,
                      damping: 15
                    }}
                    whileHover={{ 
                      y: -8, 
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMemberId(m.id)}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                        <div
                          className="h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg hover-lift"
                          style={{
                            background: `linear-gradient(135deg, ${colorFromSeed(m.id || m.name || "")} 0%, ${colorFromSeed(m.id || m.name || "")}dd 100%)`,
                          }}
                        >
                          <span className="text-xl">{m.name?.[0] || "ع"}</span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 ${
                          m.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xl font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {m.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {m.phone || "شماره تماس ثبت نشده"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`badge ${
                        m.role === 'admin' ? 'badge-error' : 
                        m.role === 'coach' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {roleOptions.find((r) => r.value === m.role)?.label || "عضو"}
                      </span>
                      <span className={`badge ${
                        m.status === 'active' ? 'badge-success' : 'badge-error'
                      }`}>
                        {statusOptions.find((s) => s.value === m.status)?.label || "فعال"}
                      </span>
                      <span className={`badge ${
                        m.level === 'gold' ? 'badge-warning' : 
                        m.level === 'silver' ? 'badge-primary' : 'badge'
                      }`}>
                        {levelOptions.find((l) => l.value === m.level)?.label || "عادی"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                      عضویت: {formatDate(m.createdAt)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {filteredMembers.length === 0 && showMembersList && (
              <motion.div 
                className="text-center py-16 fade-in"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="mx-auto w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                  <svg
                    className="w-16 h-16 text-blue-500 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                  هیچ عضوی یافت نشد
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">
                  عضو جدید اضافه کنید یا فیلترهای جستجو را تنظیم نمایید
                </p>
                <Button
                  onClick={() => setShowAddMemberModal(true)}
                  variant="primary"
                  className="inline-flex items-center gap-2 hover-lift"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  افزودن اولین عضو
                </Button>
              </motion.div>
            )}

            <div
              className={
                viewMode === "list" && showMembersList
                  ? "rounded-lg border border-outline overflow-hidden"
                  : "hidden"
              }
            >
              <table className="w-full text-sm">
                <thead className="bg-black/5 dark:bg-white/5">
                  <tr>
                    <th className="p-2 text-right">نام</th>
                    <th className="p-2 text-right">شماره تماس</th>
                    <th className="p-2 text-right">نقش</th>
                    <th className="p-2 text-right">وضعیت</th>
                    <th className="p-2 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedMemberId(m.id)}
                    >
                      <td className="p-2">{m.name}</td>
                      <td className="p-2">{m.phone}</td>
                      
                      <td className="p-2">{roleOptions.find((r) => r.value === (m.role || "member"))?.label || "عضو"}</td>
                      <td className="p-2">{statusOptions.find((s) => s.value === (m.status || "active"))?.label || "فعال"}</td>
                      <td className="p-2 flex gap-2">
                        <button
                          className="btn-secondary ripple"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMemberId(m.id);
                          }}
                        >
                          جزئیات
                        </button>
                        <button
                          className="btn-secondary ripple"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const api = window.api?.members;
                            if (!api) return;
                            await api.remove(m.id);
                            setMembers((prev) =>
                              prev.filter((x) => x.id !== m.id)
                            );
                            (await import("./utils/notify")).notifySuccess("عضو با موفقیت حذف شد");
                          }}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-white/60" colSpan={6}>
                        عضوی ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </motion.section>
          )}
        {tab === "attendance" && (
          <motion.section
            key="attendance"
            className="space-y-6"
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: anim.durations.md, ease: anim.ease }}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">سیستم حضور و غیاب</h2>
              </div>
            </div>

            <div className="card p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">انتخاب عضو</label>
                <Dropdown
                  options={[{ value: "", label: "انتخاب عضو" }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
                  value={attendanceMemberId || ""}
                  onChange={(v) => setAttendanceMemberId(v || null)}
                  disabled={!members.length}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary ripple"
                  disabled={!attendanceMemberId || !window.api?.attendance}
                  onClick={async () => {
                    const api = window.api?.attendance;
                    if (!api || !attendanceMemberId) return;
                    await api.log(attendanceMemberId, "enter");
                    const logs = await api.list(attendanceMemberId);
                    setAttendanceLogs(logs);
                    (await import("./utils/notify")).notifySuccess("ورود ثبت شد");
                  }}
                >
                  ثبت ورود
                </button>
                <button
                  className="btn-secondary ripple"
                  disabled={!attendanceMemberId || !window.api?.attendance}
                  onClick={async () => {
                    const api = window.api?.attendance;
                    if (!api || !attendanceMemberId) return;
                    await api.log(attendanceMemberId, "exit");
                    const logs = await api.list(attendanceMemberId);
                    setAttendanceLogs(logs);
                    (await import("./utils/notify")).notifySuccess("خروج ثبت شد");
                  }}
                >
                  ثبت خروج
                </button>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <h3 className="text-heading-3">لاگ‌های حضور</h3>
              </div>
              {!attendanceMemberId && (
                <p className="text-sm text-gray-600 dark:text-gray-400">ابتدا عضو را انتخاب کنید.</p>
              )}
              {attendanceMemberId && (
                <table className="w-full text-sm">
                  <thead className="bg-black/5 dark:bg-white/5">
                    <tr>
                      <th className="p-2 text-right">نوع</th>
                      <th className="p-2 text-right">زمان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLoading && (
                      <tr>
                        <td colSpan={2} className="p-3 text-center text-white/60">در حال بارگذاری...</td>
                      </tr>
                    )}
                    {!attendanceLoading && attendanceLogs.map((l) => (
                      <tr key={l.id} className="border-t border-white/5">
                        <td className="p-2">{l.type === "enter" ? "ورود" : "خروج"}</td>
                        <td className="p-2">{new Date(l.at).toLocaleString("fa-IR")}</td>
                      </tr>
                    ))}
                    {!attendanceLoading && attendanceLogs.length === 0 && (
                      <tr>
                        <td colSpan={2} className="p-3 text-center text-white/60">لاگی ثبت نشده است.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </motion.section>
        )}
        {tab === "finance" && (
          <motion.section
            key="finance"
            className="space-y-6"
            layout
            initial={anim.slideUp.initial}
            animate={anim.slideUp.animate}
            exit={anim.slideUp.exit}
            transition={{ duration: anim.durations.md, ease: anim.ease }}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="flex items.center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">مدیریت مالی</h2>
              </div>
            </div>

            <div className="card p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">انتخاب عضو</label>
                <Dropdown
                  options={[{ value: "", label: "انتخاب عضو" }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
                  value={financeMemberId || ""}
                  onChange={(v) => setFinanceMemberId(v || null)}
                  disabled={!members.length}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">مبلغ (تومان)</label>
                  <input
                    type="number"
                    className="input"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    placeholder="مثلاً 250000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">توضیحات</label>
                  <input
                    type="text"
                    className="input"
                    value={newPayment.note}
                    onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                    placeholder="مثلاً اشتراک ماهانه"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="btn-primary ripple"
                  disabled={!financeMemberId || !window.api?.finance || !newPayment.amount}
                  onClick={async () => {
                    const api = window.api?.finance;
                    if (!api || !financeMemberId) return;
                    const amountNum = Number(newPayment.amount);
                    if (!amountNum || isNaN(amountNum)) return;
                    const row = await api.addPayment({ memberId: financeMemberId, amount: amountNum, note: newPayment.note });
                    setPayments((prev) => [row, ...prev]);
                    setNewPayment({ amount: "", note: "" });
                  }}
                >
                  ثبت پرداخت
                </button>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <h3 className="text-heading-3">لیست پرداخت‌ها</h3>
              </div>
              {!financeMemberId && (
                <p className="text-sm text-gray-600 dark:text-gray-400">ابتدا عضو را انتخاب کنید.</p>
              )}
              {financeMemberId && (
                <table className="w-full text-sm">
                  <thead className="bg-black/5 dark:bg-white/5">
                    <tr>
                      <th className="p-2 text-right">مبلغ</th>
                      <th className="p-2 text-right">توضیحات</th>
                      <th className="p-2 text-right">زمان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeLoading && (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-white/60">در حال بارگذاری...</td>
                      </tr>
                    )}
                    {!financeLoading && payments.map((p) => (
                      <tr key={p.id} className="border-t border-white/5">
                        <td className="p-2">{p.amount?.toLocaleString?.("fa-IR") ?? p.amount}</td>
                        <td className="p-2">{p.note || ""}</td>
                        <td className="p-2">{new Date(p.createdAt).toLocaleString("fa-IR")}</td>
                      </tr>
                    ))}
                    {!financeLoading && payments.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-white/60">پرداختی ثبت نشده است.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </motion.section>
        )}
        {tab === "reports" && (
          <motion.section
            key="reports"
            className="space-y-6"
            layout
            initial={anim.slideUp.initial}
            animate={anim.slideUp.animate}
            exit={anim.slideUp.exit}
            transition={{ duration: anim.durations.md, ease: anim.ease }}
            style={{ willChange: "transform, opacity" }}
          >
            <ReportsPage />
          </motion.section>
        )}
        {tab === "settings" && (
          <motion.section
            key="settings"
            className="space-y-6"
            layout
            initial={anim.slideUp.initial}
            animate={anim.slideUp.animate}
            exit={anim.slideUp.exit}
            transition={{ duration: anim.durations.md, ease: anim.ease }}
            style={{ willChange: "transform, opacity" }}
          >
            <SettingsPage />
          </motion.section>
        )}
        </AnimatePresence>
      </main>

      {/* Modal برای افزودن عضو جدید */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="افزودن عضو جدید"
        size="tall"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newMember.name) return;
            const api = window.api?.members;
            if (!api) return;
            setIsLoading(true);
            try {
              const created = await api.create(newMember);
              setMembers((prev) => [created, ...prev]);
              (await import("./utils/notify")).notifySuccess("عضو جدید با موفقیت اضافه شد");
              setNewMember({
                name: "",
                phone: "",
                level: "basic",
                role: "member",
                status: "active",
              });
              setShowAddMemberModal(false);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">نام</label>
              <input
                type="text"
                className="input"
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                placeholder="نام عضو"
                required
              />
            </div>
            <div>
              <label className="label">شماره تماس</label>
              <input
                type="tel"
                className="input"
                value={newMember.phone}
                onChange={(e) =>
                  setNewMember({ ...newMember, phone: e.target.value })
                }
                placeholder="شماره تماس"
              />
            </div>
            
            <div>
              <label className="label">سطح عضویت</label>
              <LevelDropdown
                value={newMember.level}
                onChange={(level) => setNewMember({ ...newMember, level })}
              />
            </div>
            <div>
              <label className="label">نقش</label>
              <Dropdown
                options={roleOptions}
                value={newMember.role}
                onChange={(role) => setNewMember({ ...newMember, role })}
              />
            </div>
            <div>
              <label className="label">وضعیت</label>
              <Dropdown
                options={statusOptions}
                value={newMember.status}
                onChange={(status) => setNewMember({ ...newMember, status })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddMemberModal(false)}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={!newMember.name || isLoading}
            >
              ثبت عضو
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal برای فیلترهای پیشرفته */}
      <Modal
        isOpen={showFiltersModal && !selectedMember}
        onClose={() => setShowFiltersModal(false)}
        title="فیلترها"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                جستجو
              </label>
              <input
                className="input w-full"
                placeholder="جستجو نام یا شماره"
                value={filtersDraft.q}
                onChange={(e) =>
                  setFiltersDraft({ ...filtersDraft, q: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نقش
              </label>
              <Dropdown
                options={[
                  { value: "", label: "همه نقش‌ها" },
                  ...roleOptions,
                ]}
                value={filtersDraft.role}
                onChange={(v) => setFiltersDraft({ ...filtersDraft, role: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                وضعیت
              </label>
              <Dropdown
                options={[
                  { value: "", label: "همه وضعیت‌ها" },
                  ...statusOptions,
                ]}
                value={filtersDraft.status}
                onChange={(v) => setFiltersDraft({ ...filtersDraft, status: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                سطح
              </label>
              <Dropdown
                options={[
                  { value: "", label: "همه سطوح" },
                  ...levelOptions,
                ]}
                value={filtersDraft.level}
                onChange={(v) => setFiltersDraft({ ...filtersDraft, level: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                از تاریخ
              </label>
              <DateInput
                placeholder="از تاریخ"
                value={filtersDraft.createdFrom}
                onChange={(v) => setFiltersDraft({ ...filtersDraft, createdFrom: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                تا تاریخ
              </label>
              <DateInput
                placeholder="تا تاریخ"
                value={filtersDraft.createdTo}
                onChange={(v) => setFiltersDraft({ ...filtersDraft, createdTo: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                مرتب‌سازی
              </label>
              <Dropdown
                options={sortByOptions}
                value={filtersDraft.sortBy}
                onChange={(v) => setFiltersDraft({ ...filtersDraft, sortBy: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ترتیب
              </label>
              <Dropdown
                options={sortDirOptions}
                value={filtersDraft.sortDir}
                onChange={(v) =>
                  setFiltersDraft({ ...filtersDraft, sortDir: v as "asc" | "desc" })
                }
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="btn-secondary w-full transform hover:scale-105 transition-all duration-200 ripple"
                onClick={() =>
                  setFiltersDraft({
                    q: "",
                    role: "",
                    status: "",
                    level: "",
                    createdFrom: null,
                    createdTo: null,
                    sortBy: "createdAt",
                    sortDir: "desc",
                  })
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  پاک کردن فیلترها
                </div>
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowFiltersModal(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setFilters(filtersDraft);
                setShowFiltersModal(false);
              }}
            >
              اعمال فیلتر
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
