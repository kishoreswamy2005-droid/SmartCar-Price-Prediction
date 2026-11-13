import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { AXIS_TICK_STYLE, CHART_COLORS, GRID_STYLE } from "@/components/charts/chartColors";
import { formatINR, formatNumber } from "@/utils/format";

interface Props {
  data: { transmission: string; average_price: number; median_price: number; count: number }[];
}

/** Dataset: average vs median selling price by transmission type. */
export function TransmissionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis
          dataKey="transmission"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatINR(value)}
          width={68}
        />
        <Legend
          iconType="circle"
          iconSize={9}
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={
            <ChartTooltip
              formatValue={(value, name) =>
                name === "count"
                  ? `${formatNumber(Number(value))} cars`
                  : formatINR(Number(value))
              }
            />
          }
        />
        <Bar
          dataKey="average_price"
          name="Average price"
          fill={CHART_COLORS.violet}
          radius={[4, 4, 0, 0]}
          maxBarSize={72}
        />
        <Bar
          dataKey="median_price"
          name="Median price"
          fill={CHART_COLORS.amber}
          radius={[4, 4, 0, 0]}
          maxBarSize={72}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
