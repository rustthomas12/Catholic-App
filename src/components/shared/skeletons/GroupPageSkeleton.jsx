export default function GroupPageSkeleton() {
  return (
    <div className="min-h-screen bg-cream animate-pulse md:pl-60">
      {/* Header */}
      <div className="bg-navy px-4 pt-12 pb-6 flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-white/20 rounded-2xl" />
        <div className="h-5 w-40 bg-white/20 rounded" />
        <div className="h-3.5 w-24 bg-white/10 rounded" />
        <div className="h-9 w-32 bg-white/20 rounded-xl mt-1" />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 flex">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-11 flex items-center justify-center">
            <div className="h-3 w-14 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Feed skeletons */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {[1, 2].map(i => (
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
