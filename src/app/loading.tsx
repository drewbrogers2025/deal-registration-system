export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait while we load your content.</p>
      </div>
    </div>
  )
}
