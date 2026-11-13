import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CHART_PALETTE } from "@/components/charts/chartColors";
import { formatINR, formatINRShort, formatNumber } from "@/utils/format";

interface Props {
  data: { fuel: string; count: number; average_price: number }[];
}

/**
 * Fuel-type share of dataset listings (donut) — the centre shows total
 * listings and the tooltip carries the average price per fuel.
 */
export function FuelDonutChart({ data }: Props) {
  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex h-full flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative h-[65%] min-h-[150px] w-full sm:h-full sm:flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="fuel"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={3}
              strokeWidth={2}
              stroke="hsl(var(--card))"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.fuel}
                  fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  formatValue={(value, name) =>
                    name === "count"
                      ? `${formatNumber(Number(value))} listings`
                      : formatINR(Number(value))
                  }
                />
              }
            />
            <Legend
              iconType="circle"
              iconSize={9}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
          <span className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">
            {formatNumber(total)}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            listings
          </span>
        </div>
      </div>
      <ul className="flex shrink-0 flex-row flex-wrap justify-center gap-x-3 gap-y-1 sm:flex-col sm:justify-start">
        {data.map((entry, index) => (
          <li key={entry.fuel} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{entry.fuel}</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatINRShort(entry.average_price)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
