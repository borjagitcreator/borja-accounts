import type { ReactNode } from 'react';

export interface Column<T> {
  header: ReactNode;
  headerClass?: string;
  render: (row: T) => ReactNode;
  cellClass?: (row: T) => string | undefined;
}

/** Tabla genérica columnas-configurables, compartida por las 4 tablas de
 * posiciones (apuestas/inversiones × abiertas/historial) y reutilizable
 * por futuras secciones con la misma forma (fila de datos + acciones). */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
}) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} className={c.headerClass}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={rowKey(row, i)}>
            {columns.map((c, j) => (
              <td key={j} className={c.cellClass?.(row)}>
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
