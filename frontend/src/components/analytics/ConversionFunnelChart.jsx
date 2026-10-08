import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import { Card } from "../ui";
import { currency } from "../../lib/format";

export function ConversionFunnelChart({ data }) {
  // Use real data if provided, fallback to visual mock
  let chartData = [];
  if (data && data.New !== undefined) {
    chartData = [
      { stage: "New", count: data.New.count, value: data.New.value },
      { stage: "Qualified", count: data.Qualified.count, value: data.Qualified.value },
      { stage: "Proposal", count: data.Proposal.count, value: data.Proposal.value },
      { stage: "Won", count: data.Won.count, value: data.Won.value },
    ];
  } else {
    chartData = [
      { stage: "New", count: 45, value: 125000 },
      { stage: "Qualified", count: 28, value: 95000 },
      { stage: "Proposal", count: 12, value: 58000 },
      { stage: "Won", count: 4, value: 24000 },
    ];
  }

  // Smooth color ramp down the funnel
  const colors = ["var(--color-brand-200)", "var(--color-brand-400)", "var(--color-brand-500)", "var(--color-brand-700)"];

  return (
    <Card className="flex flex-col p-6 h-[340px]">
      <div className="mb-4">
        <h3 className="font-semibold text-ink">Conversion Funnel</h3>
        <p className="text-xs text-ink-soft">Active and won pipeline distribution</p>
      </div>
      <div className="flex-1 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" opacity={0.5} />
            <XAxis 
              dataKey="stage" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
              dx={-5}
            />
            <Tooltip 
              cursor={{ fill: "var(--color-surface-muted)", opacity: 0.5 }}
              contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-line)", boxShadow: "var(--shadow-soft)", padding: "8px 12px" }}
              formatter={(value, name) => [name === 'value' ? currency(value) : value, name === 'count' ? 'Leads' : 'Pipeline']}
              labelStyle={{ color: "var(--color-ink-soft)", fontSize: "12px", marginBottom: "4px", fontWeight: "bold" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
