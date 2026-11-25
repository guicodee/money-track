import type { DashboardData } from '@/types/dashboard'

export const dashboardMock: DashboardData = {
  income: 43400,
  expense: 13447.39,
  accounts: [
    { id: '1', name: 'Nubank', color: '#dfff2e', balance: 17267.88 },
    { id: '2', name: 'Santander', color: '#4fd1f5', balance: 11511.12 },
    { id: '3', name: 'Revolut', color: '#c9a0ff', balance: 7193.25 },
  ],
  cashflow: [
    { month: 'Mai', income: 4900, expense: 2500 },
    { month: 'Jun', income: 5500, expense: 2300 },
    { month: 'Jul', income: 3600, expense: 1800 },
    { month: 'Ago', income: 3600, expense: 1700 },
    { month: 'Set', income: 4900, expense: 2000 },
    { month: 'Out', income: 5500, expense: 1000 },
  ],
  categories: [
    { id: 'c1', name: 'Mercado', color: '#dfff2e', total: 3940.45 },
    { id: 'c2', name: 'Casa', color: '#3ddc84', total: 3017.67 },
    { id: 'c3', name: 'Restaurantes', color: '#7c83ff', total: 1944.97 },
    { id: 'c4', name: 'Viagem', color: '#ff7a68', total: 1651.78 },
    { id: 'c5', name: 'Transporte', color: '#ffb547', total: 1232.48 },
    { id: 'c6', name: 'Lazer', color: '#4fd1f5', total: 781.1 },
    { id: 'c7', name: 'Saúde', color: '#c9a0ff', total: 571.77 },
    { id: 'c8', name: 'Assinaturas', color: '#f2f3f7', total: 307.17 },
  ],
  recent: [
    { day: '15', label: 'Hoje · Qui out', items: [
      { id: 't1', title: 'Café da manhã', category: 'Restaurantes', amount: -8.5 },
      { id: 't2', title: 'Uber', category: 'Transporte', amount: -14.2 },
    ] },
    { day: '14', label: 'Ontem · Qua out', items: [
      { id: 't3', title: 'Supermercado', category: 'Mercado', amount: -86.4 },
      { id: 't4', title: 'Freela landing page', category: 'Renda extra', amount: 600 },
    ] },
    { day: '12', label: 'Seg · out', items: [
      { id: 't5', title: 'Cinema', category: 'Lazer', amount: -24 },
    ] },
    { day: '10', label: 'Sáb · out', items: [
      { id: 't6', title: 'Farmácia', category: 'Saúde', amount: -32.9 },
    ] },
    { day: '08', label: 'Qui · out', items: [
      { id: 't7', title: 'Spotify', category: 'Assinaturas', amount: -10.99 },
    ] },
    { day: '05', label: 'Seg · out', items: [
      { id: 't8', title: 'Salário', category: 'Salário', amount: 3800 },
      { id: 't9', title: 'Aluguel', category: 'Casa', amount: -950 },
    ] },
  ],
}