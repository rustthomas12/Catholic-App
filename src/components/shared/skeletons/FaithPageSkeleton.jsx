export default function FaithPageSkeleton() {
  return (
    <div className="animate-pulse px-4 pt-6 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="h-7 w-24 bg-gray-200 rounded mb-4" />
      <div className="h-px bg-gray-200 mb-6" />

      {/* Readings card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-8">
        <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-3 w-5/6 bg-gray-100 rounded" />
          <div className="h-3 w-4/6 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
        </div>
      </div>

      {/* Saint card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-8">
        <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-4/5 bg-gray-100 rounded" />
          </div>
        </div>
      </div>

      {/* Prayer intentions */}
      <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 h-16 mb-2" />
      ))}
    </div>
  )
}
