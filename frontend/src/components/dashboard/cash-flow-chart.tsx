import { formatCompactNet } from '@/lib/format'
import type { MonthlyCashflow } from '@/types/dashboard'

export function CashflowChart({ data }: { data: MonthlyCashflow[] }) {
  const peak = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1)
  const scale = Math.ceil(peak / 1000) * 1000
  const last = data.length - 1

  return (
    <div className="min-w-0 flex-[1.5_1_480px] border border-line bg-surface px-8 py-7">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="eyebrow">Entrada × gasto</span>
        <span className="mono-label text-xs text-subtle">
          <span className="text-income">■</span> Entrou &nbsp; <span className="text-expense">■</span> Saiu
        </span>
      </div>

      <div className="mt-5 flex h-80 gap-3">
        {data.map((d) => (
          <div key={d.month} className="flex flex-1 flex-col" role="img" aria-label={`${d.month}: entrou ${d.income}, saiu ${d.expense}`}>
            <div className="flex h-1/2 items-end justify-center border-b border-line-strong">
              <div className="w-full max-w-14 bg-income" style={{ height: `${(d.income / scale) * 100}%` }} />
            </div>
            <div className="flex h-1/2 items-start justify-center">
              <div className="w-full max-w-14 bg-expense" style={{ height: `${(d.expense / scale) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-3">
        {data.map((d, i) => (
          <div key={d.month} className="flex-1 text-center">
            <div className="mono-label text-xs text-ink-soft">{d.month}</div>
            <div className={`mt-1 text-[15px] font-medium ${i === last ? 'text-income' : 'text-ink-soft'}`}>
              {formatCompactNet(d.income - d.expense)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}