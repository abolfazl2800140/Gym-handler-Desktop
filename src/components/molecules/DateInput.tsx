import { useState } from "react";
import PersianCalendar from "./PersianCalendar";

interface DayValue {
  year: number;
  month: number;
  day: number;
}

export default function DateInput({
  value,
  onChange,
  placeholder,
}: {
  value: DayValue | null;
  onChange: (v: DayValue | null) => void;
  placeholder?: string;
}) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateChange = (date: DayValue) => {
    onChange(date);
    setIsCalendarOpen(false);
  };
  const formatDate = (date: DayValue | null) =>
    !date ? "" : `${date.year}/${date.month}/${date.day}`;

  return (
    <div className="relative">
      <input
        readOnly
        placeholder={placeholder}
        value={formatDate(value)}
        className="input w-full cursor-pointer pr-9"
        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70 pointer-events-none">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 012 0v1h4V2a1 1 0 112 0v1h1a2 2 0 012 2v2H3V5a2 2 0 012-2h1V2zm-3 7h16v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm4 2a1 1 0 100 2h2a1 1 0 100-2H7z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <PersianCalendar
        value={value}
        onChange={handleDateChange}
        onClose={() => setIsCalendarOpen(false)}
        isOpen={isCalendarOpen}
      />
    </div>
  );
}





