import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { AXIS_TICK_STYLE, CHART_COLORS, GRID_STYLE } from "@/components/charts/chartColors";
import { formatINR, formatKm, formatNumber } from "@/utils/format";

interface AgeProps {
  data: { car_age: number; selling_price: number }[];
}

/** Dataset: car age vs selling price (sampled points). */
export function AgePriceScatterChart({ data }: AgeProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          type="number"
          dataKey="car_age"
          name="Car age"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          unit=" yr"
          minTickGap={16}
        />
        <YAxis
          type="number"
          dataKey="selling_price"
          name="Selling price"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatINR(value)}
          width={68}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--muted-foreground))" }}
          content={
            <ChartTooltip
              title="Sampled car"
              formatValue={(value, name) =>
                name === "Car age"
                  ? `${formatNumber(Number(value))} years`
                  : formatINR(Number(value))
              }
            />
          }
        />
        <Scatter
          data={data}
          name="Cars"
          fill={CHART_COLORS.emerald}
          fillOpacity={0.55}
          shape="circle"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

interface KmProps {
  data: { km_driven: number; selling_price: number }[];
}

/** Dataset: kilometers driven vs selling price (sampled points). */
export function KmPriceScatterChart({ data }: KmProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          type="number"
          dataKey="km_driven"
          name="Kilometers driven"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatKm(value)}
          minTickGap={24}
        />
        <YAxis
          type="number"
          dataKey="selling_price"
          name="Selling price"
          tick={AXIS_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatINR(value)}
          width={68}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--muted-foreground))" }}
          content={
            <ChartTooltip
              title="Sampled car"
              formatValue={(value, name) =>
                name === "Kilometers driven"
                  ? formatKm(Number(value))
                  : formatINR(Number(value))
              }
            />
          }
        />
        <Scatter
          data={data}
          name="Cars"
          fill={CHART_COLORS.rose}
          fillOpacity={0.5}
          shape="circle"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
