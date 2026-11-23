import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className='w-fit'>
      <div className="card flex flex-col gap-5 p-7 border-income-line">
        <div className="flex items-center justify-between">
          <span className="label">Entrada</span>
          <span className="icon-box bg-income-bg border border-income-line">💰</span>
        </div>
        <span className="text-metric font-medium  text-income">R$ 43.400</span>
      </div>
    </div>
  )
}
