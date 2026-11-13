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
import { formatINR } from "@/utils/format";

interface Props {
  data: { brand: string; average_price: number; count: number }[];
}

/** Dataset-backed average price by brand (top N, horizontal bars). */
export function BrandPricesChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid {...GRID_STYLE} horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatINR(value)}
          width={64}
        />
        <YAxis
          type="category"
          dataKey="brand"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={96}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={
            <ChartTooltip
              title="Average price"
              formatValue={(value) => formatINR(Number(value))}
            />
          }
        />
        <Bar
          dataKey="average_price"
          name="Average price"
          fill={CHART_COLORS.blue}
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          label={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
