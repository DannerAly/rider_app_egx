const CONFIG: Record<string, { label: string; className: string }> = {
  pending:           { label: 'Pendiente',    className: 'bg-yellow-100 text-yellow-800' },
  assigned:          { label: 'Asignado',     className: 'bg-blue-100 text-blue-800' },
  heading_to_pickup: { label: 'Al pickup',    className: 'bg-purple-100 text-purple-800' },
  picked_up:         { label: 'Recogido',     className: 'bg-indigo-100 text-indigo-800' },
  in_transit:        { label: 'En camino',    className: 'bg-cyan-100 text-cyan-800' },
  delivered:         { label: 'Entregado',    className: 'bg-green-100 text-green-800' },
  cancelled:         { label: 'Cancelado',    className: 'bg-red-100 text-red-800' },
  failed:            { label: 'Fallido',      className: 'bg-zinc-100 text-zinc-600' },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-zinc-100 text-zinc-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
