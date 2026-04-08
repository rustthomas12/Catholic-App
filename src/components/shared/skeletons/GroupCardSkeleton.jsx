export default function GroupCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
        </div>
        <div className="w-16 h-8 bg-gray-200 rounded-xl flex-shrink-0" />
      </div>
    </div>
  )
}
