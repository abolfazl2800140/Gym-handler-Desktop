import Dropdown from "./Dropdown";
import DateRangePicker from "./DateRangePicker";
import { Button } from "../atoms";

interface DayValue {
  year: number;
  month: number;
  day: number;
}
type Range = { from: DayValue | null; to: DayValue | null };

export interface ReportsFilters {
  range: Range;
  membershipStatus: string; // active/inactive
  level: string; // basic/silver/gold
  paymentStatus: string; // settled/debtor/late
  classId: string;
  coachId: string;
  packageType: string;
}

const levelOptions = [
  { value: "", label: "همه سطوح" },
  { value: "basic", label: "عادی" },
  { value: "silver", label: "نقره‌ای" },
  { value: "gold", label: "طلایی" },
];

const statusOptions = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "active", label: "فعال" },
  { value: "inactive", label: "غیرفعال" },
];

const paymentOptions = [
  { value: "", label: "همه پرداخت‌ها" },
  { value: "settled", label: "تسویه" },
  { value: "debtor", label: "بدهکار" },
  { value: "late", label: "تاخیر" },
];

export default function FilterBar({
  value,
  onChange,
  onReset,
}: {
  value: ReportsFilters;
  onChange: (v: ReportsFilters) => void;
  onReset: () => void;
}) {
  const v = value;
  return (
    <div className="card p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2">
          <DateRangePicker value={v.range} onChange={(range) => onChange({ ...v, range })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">وضعیت عضویت</label>
          <Dropdown
            options={statusOptions}
            value={v.membershipStatus}
            onChange={(membershipStatus) => onChange({ ...v, membershipStatus })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">سطح</label>
          <Dropdown options={levelOptions} value={v.level} onChange={(level) => onChange({ ...v, level })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">وضعیت پرداخت</label>
          <Dropdown options={paymentOptions} value={v.paymentStatus} onChange={(paymentStatus) => onChange({ ...v, paymentStatus })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">کلاس</label>
          <Dropdown options={[{ value: "", label: "همه کلاس‌ها" }]} value={v.classId} onChange={(classId) => onChange({ ...v, classId })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">مربی</label>
          <Dropdown options={[{ value: "", label: "همه مربی‌ها" }]} value={v.coachId} onChange={(coachId) => onChange({ ...v, coachId })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع پکیج/خدمات</label>
          <Dropdown options={[{ value: "", label: "همه" }]} value={v.packageType} onChange={(packageType) => onChange({ ...v, packageType })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onReset}>ریست</Button>
        <Button variant="primary" onClick={() => { /* debounced apply handled externally */ }}>اعمال</Button>
      </div>
    </div>
  );
}