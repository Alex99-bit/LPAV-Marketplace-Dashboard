import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  empty?: ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  className?: string;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  empty,
  loading = false,
  skeletonRows = 5,
  className = "",
}: TableProps<T>) {
  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium text-text-muted">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b border-border-light last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-medium text-text-muted ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="border-b border-border-light last:border-0 hover:bg-surface/50"
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && empty && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
