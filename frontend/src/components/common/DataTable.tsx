import type { ReactNode } from 'react'

export interface TableColumn<T> {
  key: string
  header: string
  className?: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Array<TableColumn<T>>
  rows: T[]
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  rowKey: (row: T, index: number) => string
}

export default function DataTable<T>({
  columns,
  rows,
  loading,
  error,
  emptyMessage = 'No records found.',
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Loading data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/50">
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 font-semibold ${column.className ?? ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)} className="border-b border-white/5 text-sm text-white/85">
              {columns.map((column) => (
                <td key={`${column.key}-${index}`} className={`px-4 py-3 align-top ${column.className ?? ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
