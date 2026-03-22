export default function ErrorState({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <span className="text-6xl mb-4 block">😕</span>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm">{message || 'Unable to load data. Please try again.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary mt-5 text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
