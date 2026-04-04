export default function PostCardSkeleton({ showImage = false }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 md:rounded-xl md:border md:shadow-sm md:mb-2">
      <div className="animate-pulse">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
          {/* Name + meta */}
          <div className="flex-1 pt-0.5">
            <div className="h-3.5 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        </div>

        {/* Content lines */}
        <div className="space-y-2 mb-3">
          <div className="h-3.5 bg-gray-200 rounded w-full" />
          <div className="h-3.5 bg-gray-200 rounded w-5/6" />
          <div className="h-3.5 bg-gray-200 rounded w-4/6" />
        </div>

        {/* Optional image placeholder */}
        {showImage && (
          <div className="w-full h-48 bg-gray-200 rounded-lg mb-3" />
        )}

        {/* Action row */}
        <div className="flex gap-6 pt-2 border-t border-gray-100 mt-2">
          <div className="h-4 bg-gray-200 rounded w-14" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  )
}
