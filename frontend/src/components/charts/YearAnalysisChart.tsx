import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { AXIS_TICK_STYLE, CHART_COLORS, GRID_STYLE } from "@/components/charts/chartColors";
import { formatINR, formatNumber } from "@/utils/format";

interface Props {
  data: { year: number; average_price: number; median_price: number; count: number }[];
}

/** Dataset: average selling price per manufacturing year. */
export function YearAnalysisChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis
          dataKey="year"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => String(value)}
          minTickGap={22}
        />
        <YAxis
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatINR(value)}
          width={64}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
          content={
            <ChartTooltip
              formatValue={(value, name) =>
                name === "average_price"
                  ? formatINR(Number(value))
                  : `${formatNumber(Number(value))} cars`
              }
            />
          }
        />
        <Line
          type="monotone"
          dataKey="average_price"
          name="Average price"
          stroke={CHART_COLORS.emerald}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="median_price"
          name="Median price"
          stroke={CHART_COLORS.slate}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
