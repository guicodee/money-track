import { formatBRL } from '@/lib/format'
import type { Account } from '@/types/dashboard'

export function AccountList({ accounts }: { accounts: Account[] }) {
  const total = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <ul className="border-t border-line">
      {accounts.map((a) => {
        const pct = total > 0 ? (a.balance / total) * 100 : 0
        return (
          <li key={a.id} className="flex items-center gap-4 border-b border-line py-3.5">
            <span className="size-[9px]" style={{ background: a.color }} aria-hidden />
            <span className="w-24 text-base">{a.name}</span>
            <div className="h-1 flex-1 bg-line-soft" role="img" aria-label={`${Math.round(pct)}% do saldo`}>
              <div className="h-1" style={{ width: `${pct}%`, background: a.color }} />
            </div>
            <span className="w-28 text-right text-base">{formatBRL(a.balance)}</span>
          </li>
        )
      })}
    </ul>
  )
}