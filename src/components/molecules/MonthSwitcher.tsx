import { useMemo } from "react";

export default function MonthSwitcher({
  value,
  onChange,
}: {
  value: Date; // نماینده اولین روز ماه انتخاب‌شده
  onChange: (d: Date) => void;
}) {
  const label = useMemo(() => {
    return new Intl.DateTimeFormat("fa-IR", { month: "long", year: "numeric" }).format(value);
  }, [value]);

  const months = useMemo(() => {
    // 12 ماه اخیر تا آینده‌ی نزدیک برای انتخاب سریع
    const arr: { d: Date; label: string }[] = [];
    const now = new Date(value);
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const l = new Intl.DateTimeFormat("fa-IR", { month: "long", year: "numeric" }).format(d);
      arr.push({ d, label: l });
    }
    return arr;
  }, [value]);

  function prevMonth() {
    const d = new Date(value.getFullYear(), value.getMonth() - 1, 1);
    onChange(d);
  }
  function nextMonth() {
    const d = new Date(value.getFullYear(), value.getMonth() + 1, 1);
    onChange(d);
  }

  return (
    <div className="card p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button className="btn btn-secondary" onClick={prevMonth} aria-label="ماه قبل">←</button>
        <div className="text-heading-3">{label}</div>
        <button className="btn btn-secondary" onClick={nextMonth} aria-label="ماه بعد">→</button>
      </div>
      <div>
        <select
          className="input"
          value={value.toISOString()}
          onChange={(e) => {
            const iso = e.target.value;
            const d = new Date(iso);
            onChange(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
        >
          {months.map(({ d, label }) => (
            <option key={d.toISOString()} value={d.toISOString()}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}