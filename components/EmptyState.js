export default function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
      <div className="mb-2 text-3xl">○</div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
  )
}
