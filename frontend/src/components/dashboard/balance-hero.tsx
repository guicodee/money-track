import { formatBRL, splitBRL } from '@/lib/format'
import type { ReactNode } from 'react'

interface Props {
  total: number
  accountCount: number
  periodResult: number
  periodLabel: string
  children?: ReactNode
}

export function BalanceHero({ total, accountCount, periodResult, periodLabel, children }: Props) {
  const [main, cents] = splitBRL(total)
  const positive = periodResult >= 0

  return (
    <div className="flex flex-1 basis-[380px] flex-col justify-between gap-8">
      <div>
        <div className="eyebrow">Saldo acumulado · {accountCount} contas</div>
        <div className="mt-5 text-[clamp(56px,7vw,92px)] font-medium leading-none tracking-[-0.045em]">
          {main}
          <span className="text-faint">{cents}</span>
        </div>
        <div
          className={
            positive
              ? 'mt-5 inline-flex items-center gap-2.5 border border-income-line bg-income/10 px-3.5 py-2'
              : 'mt-5 inline-flex items-center gap-2.5 border border-expense-line bg-expense/10 px-3.5 py-2'
          }
        >
          <span aria-hidden className={positive ? 'text-income' : 'text-expense'}>
            {positive ? '▲' : '▼'}
          </span>
          <span className={`mono-label text-xs ${positive ? 'text-income' : 'text-expense'}`}>
            {positive ? '+' : '-'}
            {formatBRL(Math.abs(periodResult))} {periodLabel}
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}