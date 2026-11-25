import {
  AccountList,
  BalanceHero,
  CashflowChart,
  CategoryBreakdown,
  DashboardHeader,
  RecentTransactions,
  SummaryCards,
} from '@/components/dashboard'
import { dashboardMock } from '@/lib/mock-data'
import type { Period } from '@/types/dashboard'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({ component: DashboardPage })

function DashboardPage() {
  const [period, setPeriod] = useState<Period>('year')
  const data = dashboardMock // trocar por useLoaderData() quando integrar a API

  const totalBalance = data.accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <DashboardHeader period={period} onPeriodChange={setPeriod} periodCaption="2026 · BRL" />

      <main className="mx-auto flex max-w-[1360px] flex-col gap-14 px-10 py-12 max-sm:px-5">
        <section className="flex flex-wrap items-stretch gap-12">
          <BalanceHero
            total={totalBalance}
            accountCount={data.accounts.length}
            periodResult={data.income - data.expense}
            periodLabel="no ano"
          >
            <AccountList accounts={data.accounts} />
          </BalanceHero>
          <CashflowChart data={data.cashflow} />
        </section>

        <SummaryCards income={data.income} expense={data.expense} />
        <CategoryBreakdown categories={data.categories} />
        <RecentTransactions days={data.recent} />
      </main>
    </div>
  )
}