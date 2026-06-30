import { Trans, useTranslation } from "react-i18next";

/** SPA port of src/app/admin/page.tsx (empty-state for the editor pane). */
export default function AdminDashboard() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center text-center text-ink-mut">
      <div>
        <p className="text-lg">{t("admin.dashboard.selectArticle")}</p>
        <p className="mt-1 text-[13px]">
          <Trans i18nKey="admin.dashboard.orHit" components={{ strong: <strong /> }} />
        </p>
      </div>
    </div>
  );
}
