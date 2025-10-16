interface DayValue {
  year: number;
  month: number;
  day: number;
}

type Range = { from: DayValue | null; to: DayValue | null };

import DateInput from "./DateInput";
import { Badge } from "../atoms";

export default function DateRangePicker({
  value,
  onChange,
}: {
  value: Range;
  onChange: (v: Range) => void;
}) {
  const { from, to } = value;
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          از تاریخ
        </label>
        <DateInput
          value={from}
          onChange={(v) => onChange({ from: v, to })}
          placeholder="انتخاب تاریخ"
        />
      </div>
      <div className="pt-6">
        <Badge>تا</Badge>
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          تا تاریخ
        </label>
        <DateInput
          value={to}
          onChange={(v) => onChange({ from, to: v })}
          placeholder="انتخاب تاریخ"
        />
      </div>
    </div>
  );
}