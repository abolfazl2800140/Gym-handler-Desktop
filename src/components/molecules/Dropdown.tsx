import { useEffect, useRef, useState } from "react";

export default function Dropdown({
  options,
  value,
  onChange,
  disabled,
  size,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);
  const current = options.find((o) => o.value === value) || options[0];
  const sizeClass = size === "lg" ? "input-lg" : size === "sm" ? "input-sm" : "";
  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        className={`input ${sizeClass} dropdown-trigger w-full text-right flex items-center justify-between`}
        onClick={() => setOpen((o) => !o)}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="dropdown-list"
      >
        <span>{current?.label || "انتخاب"}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 opacity-70"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.27a.75.75 0 01-.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div id="dropdown-list" role="listbox" className="absolute top-full left-0 right-0 mt-1 dropdown-menu shadow-lg z-10">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`${opt.value === value ? "dropdown-item active" : "dropdown-item"}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <span className="text-primary text-xs">انتخاب</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

