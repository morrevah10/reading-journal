// Chart colors, matching the CSS variables in global.css. Every chart is a single
// series, so one hue (the app's primary) carries the data; the title names it.
export const CHART_COLORS = {
  bar: '#5b4636',
  grid: '#e6ded4',
  axis: '#c3c2b7',
  tick: '#7a6e66',
  cursor: 'rgb(91 70 54 / 0.08)',
};

export const TICK_STYLE = { fontSize: 11, fill: CHART_COLORS.tick, fontFamily: 'Heebo, system-ui, sans-serif' };
