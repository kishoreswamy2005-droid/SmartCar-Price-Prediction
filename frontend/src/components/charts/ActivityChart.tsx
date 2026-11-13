import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { AXIS_TICK_STYLE, CHART_COLORS, GRID_STYLE } from "@/components/charts/chartColors";
import { formatChartDate, formatNumber } from "@/utils/format";

interface Props {
  data: { date: string; count: number }[];
}

/** Predictions stored per day (real MongoDB records). */
export function ActivityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.cyan} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.cyan} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: string) => formatChartDate(value)}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
          content={
            <ChartTooltip
              formatLabel={(label) => formatChartDate(String(label))}
              formatValue={(value) => `${formatNumber(Number(value))} predictions`}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="count"
          name="Predictions"
          stroke={CHART_COLORS.cyan}
          strokeWidth={2.5}
          fill="url(#activityFill)"
          dot={{ r: 3, fill: CHART_COLORS.cyan, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
