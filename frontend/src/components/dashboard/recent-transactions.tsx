import { formatSignedBRL } from '@/lib/format'
import type { TransactionDay } from '@/types/dashboard'
import { SectionHeading } from './section-heading'
import { TransactionRow } from './transaction-row'

export function RecentTransactions({ days }: { days: TransactionDay[] }) {
  return (
    <section>
      <SectionHeading eyebrow="Movimentações" title="Transações recentes" />

      <div className="border-t border-line">
        {days.map((d) => {
          const total = d.items.reduce((sum, t) => sum + t.amount, 0)
          return (
            <div key={d.day} className="flex flex-wrap gap-6 border-b border-line py-6">
              <div className="basis-[150px]">
                <div className="text-5xl font-medium leading-none tracking-[-0.04em] text-accent">{d.day}</div>
                <div className="mono-label mt-2 text-xs text-subtle">{d.label}</div>
                <div className={`mono-label mt-1 text-xs ${total > 0 ? 'text-income' : 'text-subtle'}`}>
                  {formatSignedBRL(total)}
                </div>
              </div>
              <div className="flex flex-1 basis-[360px] flex-col gap-0.5">
                {d.items.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}