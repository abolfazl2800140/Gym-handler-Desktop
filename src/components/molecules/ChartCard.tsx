import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

type Point = [number, number];

export default function ChartCard({
  title,
  description,
  action,
  points,
  color = "#6366F1",
  showArea = true,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  points?: Point[];
  color?: string;
  showArea?: boolean;
}) {
  const data = (points && points.length > 0)
    ? points.map(([x, y], idx) => ({ idx, x, y }))
    : [
        { idx: 0, x: 5, y: 30 },
        { idx: 1, x: 18, y: 28 },
        { idx: 2, x: 30, y: 26 },
        { idx: 3, x: 42, y: 20 },
        { idx: 4, x: 54, y: 24 },
        { idx: 5, x: 66, y: 18 },
        { idx: 6, x: 78, y: 22 },
        { idx: 7, x: 90, y: 16 },
      ];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-heading-3">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="min-h-[180px]">
        <div className="w-full h-[160px] rounded-md border border-white/10 bg-black/5 dark:bg-white/5">
          <ResponsiveContainer width="100%" height="100%">
            {showArea ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="idx" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="y" stroke={color} fill="url(#colorArea)" strokeWidth={2} />
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="idx" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}