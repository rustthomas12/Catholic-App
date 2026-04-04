export default function CommentSkeleton() {
  return (
    <div className="flex items-start gap-2 py-2 animate-pulse">
      <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="h-3 bg-gray-200 rounded w-24 mb-1.5" />
        <div className="h-3 bg-gray-200 rounded w-4/5" />
      </div>
    </div>
  )
}
