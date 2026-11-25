import { formatBRLWhole } from '@/lib/format'
import { Banknote, ReceiptText, Scale, type LucideIcon } from 'lucide-react'

interface CardProps {
  label: string
  value: number
  icon: LucideIcon
  tone: 'income' | 'expense' | 'accent'
}

const tones = {
  income: { border: 'border-income-line', iconBox: 'border-income-line bg-income/10 text-income', value: 'text-income' },
  expense: { border: 'border-expense-line', iconBox: 'border-expense-line bg-expense/10 text-expense', value: 'text-expense' },
  accent: { border: 'border-accent-line', iconBox: 'border-accent-line bg-accent/10 text-accent', value: 'text-ink' },
}

function SummaryCard({ label, value, icon: Icon, tone }: CardProps) {
  const t = tones[tone]
  return (
    <div className={`flex flex-1 basis-60 flex-col gap-5 border bg-surface px-7 py-6 ${t.border}`}>
      <div className="flex items-center justify-between">
        <span className="mono-label text-xs text-subtle">{label}</span>
        <span className={`flex size-11 items-center justify-center border ${t.iconBox}`}>
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <div className={`text-[44px] font-medium tracking-[-0.03em] ${t.value}`}>{formatBRLWhole(value)}</div>
    </div>
  )
}

const Operator = ({ children }: { children: string }) => (
  <div aria-hidden className="self-center px-4 text-4xl text-line-strong max-md:hidden">
    {children}
  </div>
)

interface Props {
  income: number
  expense: number
}

export function SummaryCards({ income, expense }: Props) {
  return (
    <section aria-label="Resumo do período" className="flex flex-wrap items-stretch gap-y-3">
      <SummaryCard label="Entrada" value={income} icon={Banknote} tone="income" />
      <Operator>−</Operator>
      <SummaryCard label="Gasto" value={expense} icon={ReceiptText} tone="expense" />
      <Operator>=</Operator>
      <SummaryCard label="Saldo do período" value={income - expense} icon={Scale} tone="accent" />
    </section>
  )
}