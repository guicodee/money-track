export type Period = 'week' | '30d' | 'month' | 'year'

export interface Account {
  id: string
  name: string
  color: string
  balance: number
}

export interface MonthlyCashflow {
  month: string
  income: number
  expense: number
}

export interface CategoryExpense {
  id: string
  name: string
  color: string
  total: number
}

export interface Transaction {
  id: string
  title: string
  category: string
  /** positivo = receita, negativo = despesa */
  amount: number
}

export interface TransactionDay {
  day: string
  label: string
  items: Transaction[]
}

export interface DashboardData {
  accounts: Account[]
  cashflow: MonthlyCashflow[]
  categories: CategoryExpense[]
  income: number
  expense: number
  recent: TransactionDay[]
}