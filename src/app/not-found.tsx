import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-900 mb-2">404</h1>
        <p className="text-sm text-zinc-500 mb-6">Page not found</p>
        <Link
          href="/"
          className="text-sm font-semibold text-white bg-zinc-900 px-6 py-2.5 rounded-full hover:bg-zinc-800 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
