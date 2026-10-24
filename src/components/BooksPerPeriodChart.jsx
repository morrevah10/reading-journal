import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS, TICK_STYLE } from './chartTheme';
import ChartTable from './ChartTable';
import CountTooltip from './CountTooltip';

// Column chart of books per month (or per year). The x axis is reversed so time
// reads right-to-left like the rest of the Hebrew UI.
export default function BooksPerPeriodChart({ title, periodLabel, data }) {
  return (
    <section className="chart-section card" aria-labelledby="period-chart-title">
      <h3 id="period-chart-title" className="card-title">
        {title}
      </h3>
      <div className="chart" style={{ height: 220 }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 220 }}>
          <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="label"
              reversed
              interval={0}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.axis }}
              tick={TICK_STYLE}
            />
            <YAxis
              orientation="right"
              allowDecimals={false}
              width={28}
              tickLine={false}
              axisLine={false}
              tick={TICK_STYLE}
            />
            <Tooltip cursor={{ fill: CHART_COLORS.cursor }} content={<CountTooltip />} />
            <Bar dataKey="count" fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption={title}
        columns={[periodLabel, 'ספרים']}
        rows={data.map((item) => [item.label, item.count])}
      />
    </section>
  );
}
