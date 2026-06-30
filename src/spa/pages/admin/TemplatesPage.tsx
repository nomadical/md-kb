import { FaShapes } from "react-icons/fa6";
import { Trans, useTranslation } from "react-i18next";
import { can } from "@/lib/types";
import { useAuth } from "@/spa/auth/AuthProvider";
import { useAsync } from "@/spa/data/useAsync";
import { fetchTemplates } from "@/spa/data/admin";
import TemplatesManager from "@/components/TemplatesManager";
import Loading from "@/spa/pages/Loading";

/** SPA port of src/app/admin/templates/page.tsx. */
export default function TemplatesPage() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { data: templates, loading } = useAsync(fetchTemplates, []);
  if (loading || !templates) return <Loading />;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <FaShapes className="text-ink-accent" /> {t("nav.templates")}
      </h1>
      <p className="mt-1 text-[13px] text-ink-mut">
        <Trans
          i18nKey="admin.templates.subtitle"
          values={{ titleTag: "{{title}}", dateTag: "{{date}}", authorTag: "{{author}}" }}
          components={{ code: <code className="rounded bg-ink-bg px-1" /> }}
        />
      </p>
      <div className="mt-6">
        <TemplatesManager templates={templates} canDelete={can.delete(role)} />
      </div>
    </div>
  );
}
