import { cn } from '@/lib/utils'
import type { Period } from '@/types/dashboard'
import { TrendingUp } from 'lucide-react'
import { PeriodFilter } from './period-filter'

const nav = [
  { label: 'Visão geral', href: '/', active: true },
  { label: 'Contas', href: '#', active: false },
  { label: 'Relatórios', href: '#', active: false },
]

interface Props {
  period: Period
  onPeriodChange: (value: Period) => void
  periodCaption: string
}

export function DashboardHeader({ period, onPeriodChange, periodCaption }: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft px-10 py-4 max-sm:px-5">
      <div className="flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center bg-accent">
            <TrendingUp className="size-4 text-canvas" strokeWidth={2.6} aria-hidden />
          </div>
          <span className="text-xl font-semibold tracking-[-0.02em]">Money Track</span>
        </div>
        <nav aria-label="Principal" className="flex gap-6">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'mono-label border-b-2 py-1.5 text-xs no-underline',
                item.active ? 'border-accent text-accent' : 'border-transparent text-subtle hover:text-ink',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <PeriodFilter value={period} onChange={onPeriodChange} caption={periodCaption} />
    </header>
  )
}