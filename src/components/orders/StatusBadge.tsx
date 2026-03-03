import { cn } from '@/lib/utils'

const CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
  pending:           { label: 'Pendiente', dot: 'bg-amber-400 animate-pulse',  cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  assigned:          { label: 'Asignado',  dot: 'bg-blue-400',                 cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  heading_to_pickup: { label: 'Al pickup', dot: 'bg-violet-400',               cls: 'border-violet-200 bg-violet-50 text-violet-700' },
  picked_up:         { label: 'Recogido',  dot: 'bg-indigo-400',               cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  in_transit:        { label: 'En camino', dot: 'bg-cyan-400 animate-pulse',   cls: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  delivered:         { label: 'Entregado', dot: 'bg-emerald-500',              cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  cancelled:         { label: 'Cancelado', dot: 'bg-red-400',                  cls: 'border-red-200 bg-red-50 text-red-600' },
  failed:            { label: 'Fallido',   dot: 'bg-zinc-400',                 cls: 'border-zinc-200 bg-zinc-100 text-zinc-500' },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? { label: status, dot: 'bg-zinc-400', cls: 'border-zinc-200 bg-zinc-100 text-zinc-500' }
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
      cfg.cls
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
