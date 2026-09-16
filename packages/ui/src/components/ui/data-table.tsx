import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { cn } from "../../lib/utils";

export type DataTableColumn<T> = {
  header: string;
  accessor: (row: T) => React.ReactNode;
  /** Use for numeric/data columns to render in the mono data typeface. */
  numeric?: boolean;
  className?: string;
};

export function DataTable<T>({
  columns,
  data,
  keyField,
  className,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  keyField: (row: T) => string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.header}
                className="h-auto py-3 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle"
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={keyField(row)} className="border-border">
              {columns.map((col) => (
                <TableCell
                  key={col.header}
                  className={cn("py-3.5", col.numeric && "font-mono", col.className)}
                >
                  {col.accessor(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
