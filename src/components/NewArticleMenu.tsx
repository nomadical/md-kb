import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { FaPlus, FaChevronDown, FaShapes } from "react-icons/fa6";
import { createArticle, createArticleFromTemplate } from "@/spa/data/writes";
import { useRouter } from "@/components/ui/navigation";

/** "New article" + a dropdown to start from a template. */
export default function NewArticleMenu({
  templates,
}: {
  templates: { id: string; name: string }[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // The create actions used to redirect server-side; now they return the new id
  // and we navigate into the editor here.
  const startNew = (make: () => Promise<{ id: string }>) =>
    startTransition(async () => {
      const { id } = await make();
      router.push(`/admin/${id}`);
    });

  return (
    <div className="relative px-2 pt-2">
      <div className="flex gap-1">
        <button
          onClick={() => startNew(() => createArticle())}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-ink-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
        >
          <FaPlus className="text-[11px]" /> {t("admin.newArticle.newArticle")}
        </button>
        {templates.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={pending}
            aria-label={t("admin.newArticle.fromTemplate")}
            title={t("admin.newArticle.fromTemplate")}
            className="rounded-md bg-ink-accent px-2 text-white hover:bg-ink-accentHover disabled:opacity-60"
          >
            <FaChevronDown className="text-[11px]" />
          </button>
        )}
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-2 right-2 z-20 mt-1 overflow-hidden rounded-md border border-ink-line bg-ink-panel shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-ink-line px-3 py-1.5 text-[11px] uppercase tracking-wide text-ink-mut">
              <FaShapes className="text-[10px]" />{" "}
              {t("admin.newArticle.fromTemplateHeader")}
            </div>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setOpen(false);
                  startNew(() => createArticleFromTemplate(t.id));
                }}
                className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-ink-accent/5"
              >
                {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
