import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <p className="text-6xl font-bold text-blue-600 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Page not found</h1>
        <p className="text-slate-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Go home
        </Link>
      </div>
    </div>
  );
}
