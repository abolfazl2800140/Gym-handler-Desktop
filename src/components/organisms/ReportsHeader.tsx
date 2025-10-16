import ExportMenu from "../molecules/ExportMenu";

export default function ReportsHeader({
  onExport,
  summaryText,
}: {
  onExport: (t: "csv" | "excel" | "pdf" | "print") => void;
  summaryText?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">گزارشات</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">نمودارها و KPIهای کلیدی کسب‌وکار</p>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {summaryText || "دامنه تاریخ و فیلترها را از بالا تنظیم کنید."}
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            میانبرها: <span className="badge">P: چاپ</span> <span className="badge">C: CSV</span> <span className="badge">E: Excel</span> <span className="badge">D: PDF</span>
          </div>
        </div>
      </div>
      <ExportMenu onExport={onExport} />
    </div>
  );
}