import { useOutletContext, useParams } from "react-router-dom";
import Link from "@/components/ui/AppLink";
import { slugify } from "@/lib/markdown";
import AccessBadges from "@/components/AccessBadges";
import type { PublicOutletContext } from "@/spa/pages/public/PublicLayout";
import Loading from "@/spa/pages/Loading";
import NotFound from "@/spa/pages/NotFound";

/** SPA port of src/app/(public)/c/[slug]/page.tsx (category listing). */
export default function ContextPage() {
  const { slug } = useParams<{ slug: string }>();
  const { articles, loading } = useOutletContext<PublicOutletContext>();

  if (loading) return <Loading />;

  const inCategory = articles.filter(
    (a) => slugify(a.folder.split("/")[0] || "General") === slug,
  );
  if (inCategory.length === 0) return <NotFound message="Category not found" />;

  const name = inCategory[0].folder.split("/")[0] || "General";
  const sorted = [...inCategory].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="fade-up mx-auto max-w-3xl">
      <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-ink-mut">
        <Link href="/" className="hover:text-ink-accent">
          Knowledge Base
        </Link>
        <span>/</span>
        <span className="text-ink-fg">{name}</span>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 text-[14px] text-ink-mut">
        {sorted.length} article{sorted.length === 1 ? "" : "s"}
      </p>

      <ul className="mt-6 space-y-3">
        {sorted.map((a) => (
          <li key={a.id}>
            <Link
              href={`/kb/${a.slug}`}
              className="group block rounded-xl border border-ink-line bg-ink-panel p-4 transition-all hover:-translate-y-0.5 hover:border-ink-accent hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium group-hover:text-ink-accent">
                  {a.title}
                </span>
                <AccessBadges roles={a.access_roles} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
