import type { ReactNode } from 'react'

interface Props {
  eyebrow: string
  title: string
  aside?: ReactNode
}

export function SectionHeading({ eyebrow, title, aside }: Props) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mb-6 mt-3 text-4xl font-normal tracking-[-0.025em]">{title}</h2>
      </div>
      {aside}
    </div>
  )
}