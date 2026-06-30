import { FaTrashCan } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { useAsync } from "@/spa/data/useAsync";
import { fetchTrash } from "@/spa/data/admin";
import TrashManager from "@/components/TrashManager";
import Loading from "@/spa/pages/Loading";

/** SPA port of src/app/admin/trash/page.tsx. */
export default function TrashPage() {
  const { t } = useTranslation();
  const { data: rows, loading } = useAsync(fetchTrash, []);
  if (loading || !rows) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <FaTrashCan className="text-ink-accent" /> {t("nav.trash")}
      </h1>
      <p className="mt-1 text-[13px] text-ink-mut">
        {t("admin.trash.subtitle")}
      </p>
      <div className="mt-6">
        <TrashManager rows={rows} />
      </div>
    </div>
  );
}
