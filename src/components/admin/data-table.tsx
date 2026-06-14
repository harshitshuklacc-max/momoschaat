"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  selected?: string[];
  onSelectChange?: (ids: string[]) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  selectable,
  selected = [],
  onSelectChange,
  emptyMessage = "No data found",
  loading,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && selected.length === data.length;

  const toggleAll = () => {
    if (!onSelectChange) return;
    onSelectChange(allSelected ? [] : data.map((d) => d.id));
  };

  const toggleOne = (id: string) => {
    if (!onSelectChange) return;
    onSelectChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {selectable && (
              <th className="w-12 px-4 py-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-4 py-3 text-left font-medium text-muted-foreground", col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-4 py-12 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                className="border-b border-white/5 transition-colors hover:bg-white/5"
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={() => toggleOne(row.id)}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
