interface Props {
  title: string
  subtitle?: string
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-white tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-dim mt-1">{subtitle}</p>}
    </div>
  )
}
