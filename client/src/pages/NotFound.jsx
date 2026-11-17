import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-bold text-gray-900">404</h1>
      <p className="text-gray-500 mt-2 mb-6">That page doesn't exist.</p>
      <Link
        to="/"
        className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700"
      >
        Back to home
      </Link>
    </div>
  );
}