import { Button } from "../atoms";

export default function ExportMenu({ onExport }: { onExport: (type: "csv" | "excel" | "pdf" | "print") => void }) {
  return (
    <div className="flex items-center gap-2" role="menu" aria-label="گزینه‌های خروجی گزارشات">
      <Button variant="secondary" onClick={() => onExport("csv")} aria-label="خروجی CSV">CSV</Button>
      <Button variant="secondary" onClick={() => onExport("excel")} aria-label="خروجی Excel">Excel</Button>
      <Button variant="secondary" onClick={() => onExport("pdf")} aria-label="خروجی PDF">PDF</Button>
      <Button variant="primary" onClick={() => onExport("print")} aria-label="چاپ گزارش">چاپ</Button>
    </div>
  );
}