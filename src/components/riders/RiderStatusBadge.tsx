import { cn } from '@/lib/utils'

const CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
  available: { label: 'Disponible',   dot: 'bg-emerald-500 animate-pulse', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  busy:      { label: 'En pedido',    dot: 'bg-blue-500 animate-pulse',    cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  on_break:  { label: 'Descanso',     dot: 'bg-amber-400',                 cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  offline:   { label: 'Desconectado', dot: 'bg-zinc-400',                  cls: 'border-zinc-200 bg-zinc-100 text-zinc-500' },
}

export default function RiderStatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? CONFIG.offline
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
