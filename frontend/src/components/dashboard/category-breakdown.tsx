import { formatBRL } from '@/lib/format'
import type { CategoryExpense } from '@/types/dashboard'
import { SectionHeading } from './section-heading'

export function CategoryBreakdown({ categories }: { categories: CategoryExpense[] }) {
  const total = categories.reduce((sum, c) => sum + c.total, 0)
  const share = (value: number) => (total > 0 ? (value / total) * 100 : 0)

  return (
    <section>
      <SectionHeading
        eyebrow="Gastos por categoria"
        title="Para onde foi o dinheiro"
        aside={<span className="mono-label text-[13px] text-subtle">Total {formatBRL(total)}</span>}
      />

      <div className="flex h-14 gap-[3px]" aria-hidden>
        {categories.map((c) => (
          <div key={c.id} style={{ width: `${share(c.total)}%`, background: c.color }} />
        ))}
      </div>

      <ul className="grid grid-cols-1 border-l border-line sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <li key={c.id} className="min-w-0 border-b border-r border-line px-6 py-[22px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-base">
                <span className="size-[9px]" style={{ background: c.color }} aria-hidden />
                {c.name}
              </span>
              <span className="mono-label text-xs text-faint">{Math.round(share(c.total))}%</span>
            </div>
            <div className="mt-3.5 text-[26px] font-medium tracking-[-0.02em]">{formatBRL(c.total)}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}