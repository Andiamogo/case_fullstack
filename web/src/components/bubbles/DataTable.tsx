import type { CellValue } from "../../types/events";

interface DataTableProps {
  columns: string[];
  rows: CellValue[][];
  totalRows: number;
  displayedRows: number;
}

/**
 * Renders a data table with column headers and rows
 */
export function DataTable({ columns, rows, totalRows, displayedRows }: DataTableProps) {
  const formatCell = (value: CellValue): string => {
    if (value === null) return "—";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") {
      // Format numbers with reasonable precision
      if (Number.isInteger(value)) return value.toLocaleString();
      return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
    return String(value);
  };

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <span className="data-table-info">
          {displayedRows === totalRows
            ? `${totalRows} rows`
            : `Showing ${displayedRows} of ${totalRows} rows`}
        </span>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} title={String(cell ?? "")}>
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
