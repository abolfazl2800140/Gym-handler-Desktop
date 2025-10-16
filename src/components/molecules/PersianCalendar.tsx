import React, { useState, useEffect, useRef } from 'react';

interface PersianDate {
  year: number;
  month: number;
  day: number;
}

interface PersianCalendarProps {
  value?: PersianDate | null;
  onChange: (date: PersianDate) => void;
  onClose?: () => void;
  isOpen: boolean;
}

const PersianCalendar: React.FC<PersianCalendarProps> = ({
  value,
  onChange,
  onClose,
  isOpen
}) => {
  const [currentYear, setCurrentYear] = useState(value?.year || 1403);
  const [currentMonth, setCurrentMonth] = useState(value?.month || 1);
  const calendarRef = useRef<HTMLDivElement>(null);

  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const persianWeekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  const persianToGregorian = (pYear: number, pMonth: number, pDay: number) => {
    const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let jy = pYear - 979;
    // let jp = 0; // not used
    let jd = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
    for (let i = 0; i < pMonth - 1; ++i) jd += i < 6 ? 31 : 30;
    jd += pDay;
    let gy = 1600;
    let gm = 1;
    // let gd = 1; // not used
    jd += 79;
    let gy2 = 400;
    jd += 365 * gy2 + Math.floor(gy2 / 4) - Math.floor(gy2 / 100) + Math.floor(gy2 / 400) - 80 + 22;
    gy += gy2;
    let leap = -14;
    let jp2 = -1;
    while (jp2 < 0) {
      leap += 33;
      jp2 = Math.floor(leap / 128);
    }
    gy2 = jp2 * 400;
    jd += 365 * gy2 + Math.floor(gy2 / 4) - Math.floor(gy2 / 100) + Math.floor(gy2 / 400) - 80 + 22;
    gy += gy2;
    leap = leap % 128;
    jp2 = Math.floor(leap / 29);
    gy2 = jp2 * 100;
    jd += 365 * gy2 + Math.floor(gy2 / 4) - Math.floor(gy2 / 100) + Math.floor(gy2 / 400) - 80 + 22;
    gy += gy2;
    leap = leap % 29;
    jp2 = Math.floor(leap / 1);
    gy2 = jp2 * 4;
    jd += 365 * gy2 + Math.floor(gy2 / 4) - Math.floor(gy2 / 100) + Math.floor(gy2 / 400) - 80 + 22;
    gy += gy2;
    leap = leap % 1;
    gy += leap;
    const isLeapYear = (year: number) => ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
    while (jd >= (isLeapYear(gy) ? 366 : 365)) {
      jd -= isLeapYear(gy) ? 366 : 365;
      gy++;
    }
    if (isLeapYear(gy)) gDaysInMonth[1] = 29;
    while (jd >= gDaysInMonth[gm - 1]) {
      jd -= gDaysInMonth[gm - 1];
      gm++;
    }
    return new Date(gy, gm - 1, jd);
  };

  const getDaysInMonth = (year: number, month: number) => {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isLeapYear(year) ? 30 : 29;
  };

  const isLeapYear = (year: number) => {
    const breaks = [
      -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
      1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
    ];
    let jp = breaks[0];
    let jump = 0;
    for (let j = 1; j <= 19; j++) {
      const jm = breaks[j];
      jump = jm - jp;
      if (year < jm) break;
      jp = jm;
    }
    let n = year - jp;
    if (n < jump) {
      if (jump - n < 6) n = n - jump + ((jump + 4) / 6) * 6;
      if ((jump % 6) === 0) n = n + 1;
    }
    return ((n % 33) % 4) === 1;
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const gregorianDate = persianToGregorian(year, month, 1);
    return (gregorianDate.getDay() + 1) % 7;
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: (number|null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  };

  const handleDateClick = (day: number) => {
    const selectedDate: PersianDate = { year: currentYear, month: currentMonth, day };
    onChange(selectedDate);
    onClose?.();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else setCurrentMonth(currentMonth - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else setCurrentMonth(currentMonth + 1);
  };
  const handlePrevYear = () => setCurrentYear(currentYear - 1);
  const handleNextYear = () => setCurrentYear(currentYear + 1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) onClose?.();
    };
    const handleEscapeKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose?.(); };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const calendarDays = generateCalendarDays();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={calendarRef} className="bg-gray-800 rounded-lg shadow-xl p-6 w-80 border border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handlePrevYear} className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors">««</button>
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors">«</button>
          <div className="text-center">
            <div className="text-white font-semibold">{persianMonths[currentMonth - 1]} {currentYear}</div>
          </div>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors">»</button>
          <button onClick={handleNextYear} className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors">»»</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2 text-gray-300">
          {persianWeekDays.map((wd) => (<div key={wd} className="text-center font-medium">{wd}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => (
            day === null ? (
              <div key={idx} className="p-2" />
            ) : (
              <button key={idx} className="p-2 rounded hover:bg-gray-700 text-gray-200 hover:text-white transition-colors"
                onClick={() => handleDateClick(day)}>
                {day}
              </button>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

export default PersianCalendar;