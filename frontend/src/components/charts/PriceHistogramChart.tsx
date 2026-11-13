import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { AXIS_TICK_STYLE, CHART_COLORS, GRID_STYLE } from "@/components/charts/chartColors";
import { formatNumber } from "@/utils/format";

interface Props {
  data: { label: string; count: number }[];
}

/** Dataset: histogram of actual selling prices. */
export function PriceHistogramChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          angle={-32}
          textAnchor="end"
          height={58}
          interval={0}
          minTickGap={4}
        />
        <YAxis
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={
            <ChartTooltip
              title="Price bucket"
              formatValue={(value) => `${formatNumber(Number(value))} cars`}
            />
          }
        />
        <Bar
          dataKey="count"
          name="Cars"
          fill={CHART_COLORS.amber}
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
