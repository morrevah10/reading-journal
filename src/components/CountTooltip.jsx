// Recharts tooltip content: "אוק׳: 3 ספרים".
export default function CountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = label ?? item.payload?.genre ?? item.payload?.label;
  return (
    <div className="chart-tooltip" dir="rtl">
      <strong>{name}</strong>: {item.value} {item.value === 1 ? 'ספר' : 'ספרים'}
    </div>
  );
}
