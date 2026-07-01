import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaChartLine,
  FaUsers,
  FaClipboardCheck,
  FaTrashCan,
  FaScroll,
  FaShapes,
  FaGear,
} from "react-icons/fa6";
import Link from "@/components/ui/AppLink";
import { can, normalizeLanguage } from "@/lib/types";
import { useAuth } from "@/spa/auth/AuthProvider";
import { useArticles } from "@/spa/data/articles";
import { useAsync } from "@/spa/data/useAsync";
import { fetchMyDrafts, fetchTemplatesLite } from "@/spa/data/admin";
import AppShell from "@/components/AppShell";
import ArticleTree from "@/components/ArticleTree";
import RoleBadge from "@/components/RoleBadge";
import CommandPalette from "@/components/CommandPalette";
import NewArticleMenu from "@/components/NewArticleMenu";

/** SPA port of src/app/admin/layout.tsx. Role is from the auth context; the
 *  route guard already restricts /admin to staff. */
export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { session, role } = useAuth();
  const { articles } = useArticles(
    true, // include drafts
    normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
  );
  const { data: templates } = useAsync(
    () => (can.edit(role) ? fetchTemplatesLite() : Promise.resolve([])),
    [role],
  );
  // Overlay the caller's draft titles so never-published drafts show their real
  // title (the articles row stays "Untitled" until the draft is published).
  const { data: myDrafts } = useAsync(fetchMyDrafts, []);
  const draftTitle = new Map((myDrafts ?? []).map((d) => [d.articleId, d.title]));
  const treeItems = (articles ?? []).map((a) =>
    draftTitle.has(a.id) ? { ...a, title: draftTitle.get(a.id)! } : a,
  );

  const sidebar = (
    <>
      {can.edit(role) ? (
        <NewArticleMenu templates={templates ?? []} />
      ) : can.review(role) ? (
        <p className="px-3 pt-3 text-[12px] text-ink-mut">
          {t("admin.layout.reviewerNotice")}
        </p>
      ) : (
        <p className="px-3 pt-3 text-[12px] text-ink-mut">
          {t("admin.layout.readOnlyNotice")}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ArticleTree items={treeItems} basePath="/admin" linkKey="id" />
      </div>

      {can.review(role) && (
        <Link
          href="/admin/review"
          className="flex items-center gap-2 border-t border-ink-line px-4 py-2 text-[13px] text-ink-accent hover:bg-ink-accent/5"
        >
          <FaClipboardCheck /> {t("nav.reviewQueue")}
        </Link>
      )}
      {can.edit(role) && (
        <Link
          href="/admin/templates"
          className="flex items-center gap-2 border-t border-ink-line px-4 py-2 text-[13px] text-ink-accent hover:bg-ink-accent/5"
        >
          <FaShapes /> {t("nav.templates")}
        </Link>
      )}
      <Link
        href="/admin/analytics"
        className="flex items-center gap-2 border-t border-ink-line px-4 py-2 text-[13px] text-ink-accent hover:bg-ink-accent/5"
      >
        <FaChartLine /> {t("nav.analytics")}
      </Link>
      {can.manageUsers(role) && (
        <Link
          href="/admin/users"
          className="flex items-center gap-2 px-4 py-2 text-[13px] text-ink-accent hover:bg-ink-accent/5"
        >
          <FaUsers /> {t("nav.manageUsers")}
        </Link>
      )}
      {can.audit(role) && (
        <Link
          href="/admin/trash"
          className="flex items-center gap-2 px-4 py-2 text-[13px] text-ink-accent hover:bg-ink-accent/5"
        >
          <FaTrashCan /> {t("nav.trash")}
        </Link>
      )}
      {can.audit(role) && (
        <Link
          href="/admin/audit"
          className="flex items-center gap-2 px-4 py-2 text-[13px] text-ink-accent hover:bg-ink-accent/5"
        >
          <FaScroll /> {t("nav.auditLog")}
        </Link>
      )}
      {can.manageUsers(role) && (
        <Link
          href="/admin/settings"
          className="flex items-center gap-2 px-4 py-2 text-[13px] text-ink-accent hover:bg-ink-accent/5"
        >
          <FaGear /> {t("nav.settings")}
        </Link>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-ink-line px-4 py-2 text-[11px] text-ink-mut">
        <span className="truncate">{session?.user.email}</span>
        {role && <RoleBadge role={role} />}
      </div>
    </>
  );

  return (
    <AppShell mode="admin" sidebar={sidebar}>
      {/* Scrolls the content pages (audit/users/trash/…). The editor fills
          h-full and manages its own internal scroll, so it never overflows
          this and no page-level scrollbar appears for it. */}
      <main
        className="min-w-0 flex-1 overflow-y-auto focus:outline-none"
        id="main-scroll"
        tabIndex={-1}
      >
        <Outlet />
      </main>
      <CommandPalette role={role} />
    </AppShell>
  );
}