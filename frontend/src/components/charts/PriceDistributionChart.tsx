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
  data: { range: string; count: number }[];
}

/** Distribution of *predicted* prices across stored records (MongoDB). */
export function PriceDistributionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis
          dataKey="range"
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
          width={40}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={
            <ChartTooltip
              title="Price range"
              formatValue={(v) => formatNumber(Number(v))}
            />
          }
        />
        <Bar
          dataKey="count"
          name="Predictions"
          fill={CHART_COLORS.blue}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
