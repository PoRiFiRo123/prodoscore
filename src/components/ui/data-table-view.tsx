import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Snippet } from "@/hooks/useSnippets"

interface DataTableViewProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[],
  data: TData[],
  loading: boolean,
  onDelete?: (id: string) => void
  onUpdate?: (snippet:Snippet) => void
  getRowId?: (row: TData) => string,
}

export function DataTableView<TData, TValue>({
  columns,
  data,
  loading,
  onDelete,
  onUpdate,
  getRowId,
}: DataTableViewProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
             <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onUpdate && onUpdate(row.original as any)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete && onDelete((row.original as any).id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
