import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card } from "../ui";
import { currency } from "../../lib/format";

export function PipelineTrendChart({ data = [] }) {
  // Mock data if none provided, for visual polish
  const chartData = data.length ? data : [
    { date: "Oct 1", value: 12000 },
    { date: "Oct 5", value: 15000 },
    { date: "Oct 10", value: 24000 },
    { date: "Oct 15", value: 21000 },
    { date: "Oct 20", value: 38000 },
    { date: "Oct 25", value: 45000 },
    { date: "Oct 30", value: 65000 },
  ];

  return (
    <Card className="flex flex-col p-6 h-[340px]">
      <div className="mb-4">
        <h3 className="font-semibold text-ink">Pipeline Trend</h3>
        <p className="text-xs text-ink-soft">Total open revenue over the last 30 days</p>
      </div>
      <div className="flex-1 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
              tickFormatter={(val) => `$${val / 1000}k`}
              dx={-5}
            />
            <Tooltip 
              cursor={{ stroke: "var(--color-line)", strokeWidth: 1, strokeDasharray: "4 4" }}
              contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-line)", boxShadow: "var(--shadow-soft)", padding: "8px 12px" }}
              formatter={(value) => [currency(value), "Pipeline"]}
              labelStyle={{ color: "var(--color-ink-soft)", fontSize: "12px", marginBottom: "4px" }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="var(--color-brand-500)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              activeDot={{ r: 5, strokeWidth: 0, fill: "var(--color-brand-600)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
