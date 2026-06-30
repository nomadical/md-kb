import { Link } from "react-router-dom";

/** Replaces Next's notFound() / not-found page for SPA routes. */
export default function NotFound({ message = "Page not found" }: { message?: string }) {
  return (
    <div className="fade-up mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{message}</h1>
      <p className="mt-2 text-[14px] text-ink-mut">
        The page you’re looking for doesn’t exist or you don’t have access.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block text-[14px] font-medium text-ink-accent hover:underline"
      >
        ← Back to the knowledge base
      </Link>
    </div>
  );
}
