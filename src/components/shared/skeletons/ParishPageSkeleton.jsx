export default function ParishPageSkeleton() {
  return (
    <div className="min-h-screen bg-cream animate-pulse">
      {/* Header */}
      <div className="bg-navy h-40" />

      {/* Info bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-8 w-24 bg-gray-200 rounded-full" />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 flex gap-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-11 flex items-center justify-center">
            <div className="h-3 w-14 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                <div className="h-2.5 w-20 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-3 w-4/5 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
