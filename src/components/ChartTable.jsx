import { useId, useState } from 'react';

// "Show as table" toggle under a chart, so the data is readable without the graphic.
export default function ChartTable({ caption, columns, rows }) {
  const [open, setOpen] = useState(false);
  const tableId = useId();

  return (
    <div className="chart-table">
      <button
        type="button"
        className="link-button"
        aria-expanded={open}
        aria-controls={tableId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'הסתר טבלה' : 'הצג כטבלה'}
      </button>
      {open && (
        <div className="table-scroll">
          <table id={tableId}>
            <caption>{caption}</caption>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
