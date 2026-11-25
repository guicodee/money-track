import { formatSignedBRL } from '@/lib/format'
import type { Transaction } from '@/types/dashboard'

export function TransactionRow({ transaction: t }: { transaction: Transaction }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-line bg-surface px-4 py-3">
      <div>
        <div className="text-[17px] font-medium">{t.title}</div>
        <div className="mono-label mt-[3px] text-[11px] text-faint">{t.category}</div>
      </div>
      <div className={`text-[19px] ${t.amount > 0 ? 'text-income' : 'text-ink'}`}>{formatSignedBRL(t.amount)}</div>
    </div>
  )
}