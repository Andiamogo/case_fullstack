import type { DataTableMessage } from "../../types/events";
import { DataTable } from "./DataTable";

export function DataTableBubble({ message }: { message: DataTableMessage }) {
  return (
    <div className="message data-table">
      <div className="label">Query Results</div>
      <DataTable
        columns={message.metadata.columns}
        rows={message.metadata.rows}
        totalRows={message.metadata.totalRows}
        displayedRows={message.metadata.displayedRows}
      />
    </div>
  );
}
