const CONFIG: Record<string, { label: string; dot: string; className: string }> = {
  available: { label: 'Disponible',   dot: 'bg-green-500',  className: 'bg-green-100 text-green-800' },
  busy:      { label: 'En pedido',    dot: 'bg-yellow-500', className: 'bg-yellow-100 text-yellow-800' },
  on_break:  { label: 'Descanso',     dot: 'bg-orange-500', className: 'bg-orange-100 text-orange-800' },
  offline:   { label: 'Desconectado', dot: 'bg-zinc-400',   className: 'bg-zinc-100 text-zinc-600' },
}

export default function RiderStatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? CONFIG.offline
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
