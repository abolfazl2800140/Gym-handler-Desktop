import { Badge } from "../atoms";

export default function KPIGrid({
  items,
}: {
  items: Array<{ label: string; value: string | number; change?: number; hint?: string }>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it, idx) => (
        <div
          key={idx}
          className="card p-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/10"
          title={it.hint || undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm text-gray-600 dark:text-gray-400">{it.label}</h4>
              <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{it.value}</div>
              {it.hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{it.hint}</p>}
            </div>
            {typeof it.change === "number" && (
              <Badge
                className={
                  it.change > 0
                    ? "text-green-600 dark:text-green-300"
                    : it.change < 0
                    ? "text-red-600 dark:text-red-300"
                    : "text-gray-700 dark:text-gray-200"
                }
              >
                {it.change > 0
                  ? `▲ ${it.change}%`
                  : it.change < 0
                  ? `▼ ${Math.abs(it.change)}%`
                  : "—"}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}