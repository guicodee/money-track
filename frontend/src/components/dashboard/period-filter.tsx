import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Period } from '@/types/dashboard';

const options: { value: Period; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: '30d', label: '30 dias' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
]

interface Props {
  value: Period
  onChange: (value: Period) => void
  caption: string
}

export function PeriodFilter({ value, onChange, caption }: Props) {
  return (
    <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value
        return (
          <Button
            key={o.value}
            size="sm"
            variant={active ? 'default' : 'outline'}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn('mono-label rounded-none', active && 'font-semibold')}
          >
            {o.label}
          </Button>
        )
      })}
      <span className="mono-label inline-flex h-9 items-center border border-input px-3.5 text-[13px] text-ink-soft">
        {caption}
      </span>
    </div>
  )
}