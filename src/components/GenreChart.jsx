import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, TICK_STYLE } from './chartTheme';
import ChartTable from './ChartTable';
import CountTooltip from './CountTooltip';

const ROW_HEIGHT = 32;

// Horizontal bars, largest genre first. Bars grow right-to-left (reversed x axis)
// with genre names on the right and the count directly labeled at the bar's end.
export default function GenreChart({ data }) {
  const height = data.length * ROW_HEIGHT + 16;

  return (
    <section className="chart-section card" aria-labelledby="genre-chart-title">
      <h3 id="genre-chart-title" className="card-title">
        התפלגות ז'אנרים
      </h3>
      <div className="chart" style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height }}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 4, left: 28, bottom: 0 }}>
            <XAxis type="number" reversed hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="genre"
              orientation="right"
              width={96}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.axis }}
              tick={TICK_STYLE}
            />
            <Tooltip cursor={{ fill: CHART_COLORS.cursor }} content={<CountTooltip />} />
            <Bar dataKey="count" fill={CHART_COLORS.bar} radius={[4, 0, 0, 4]} barSize={18}>
              <LabelList dataKey="count" position="left" style={TICK_STYLE} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="התפלגות ז'אנרים"
        columns={["ז'אנר", 'ספרים']}
        rows={data.map((item) => [item.genre, item.count])}
      />
    </section>
  );
}
