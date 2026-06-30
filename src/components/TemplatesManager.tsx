import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@/components/ui/navigation";
import { FaPlus, FaTrashCan } from "react-icons/fa6";
import { saveTemplate, deleteTemplate } from "@/spa/data/writes";
import type { Template } from "@/lib/templates";

type Draft = {
  id?: string;
  name: string;
  description: string;
  content: string;
  folder: string;
  tags: string;
};

const BLANK: Draft = {
  name: "",
  description: "",
  content: "# {{title}}\n\n",
  folder: "",
  tags: "",
};

function toDraft(t: Template): Draft {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? "",
    content: t.content,
    folder: t.folder,
    tags: t.tags.join(", "),
  };
}

export default function TemplatesManager({
  templates,
  canDelete,
}: {
  templates: Template[];
  canDelete: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveTemplate({
        id: draft.id,
        name: draft.name,
        description: draft.description,
        content: draft.content,
        folder: draft.folder,
        tags: draft.tags.split(","),
      });
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString());
        router.refresh();
      } else setError(res.error);
    });
  }

  function remove() {
    if (!draft.id) return;
    if (!confirm(t("admin.templates.confirmDelete", { name: draft.name }))) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTemplate(draft.id!);
      if (res.ok) {
        setDraft(BLANK);
        router.refresh();
      } else setError(res.error);
    });
  }

  const field =
    "w-full rounded border border-ink-line bg-ink-panel px-2 py-1 text-[13px] outline-none focus:border-ink-accent";

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* list */}
      <div>
        <button
          onClick={() => setDraft(BLANK)}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-ink-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-ink-accentHover"
        >
          <FaPlus className="text-[11px]" /> {t("admin.templates.newTemplate")}
        </button>
        <ul className="overflow-hidden rounded-lg border border-ink-line">
          {templates.length === 0 && (
            <li className="px-3 py-2 text-[13px] text-ink-mut">
              {t("admin.templates.empty")}
            </li>
          )}
          {templates.map((tpl) => (
            <li key={tpl.id} className="border-b border-ink-line last:border-0">
              <button
                onClick={() => setDraft(toDraft(tpl))}
                className={`block w-full px-3 py-2 text-left text-[13px] hover:bg-ink-accent/5 ${
                  draft.id === tpl.id ? "bg-ink-accent/10 text-ink-accent" : ""
                }`}
              >
                <span className="block font-medium">{tpl.name}</span>
                {tpl.description && (
                  <span className="block truncate text-[12px] text-ink-mut">
                    {tpl.description}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* editor */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1">
            <span className="block text-[12px] text-ink-mut">
              {t("admin.templates.name")}
            </span>
            <input className={field} value={draft.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="w-40">
            <span className="block text-[12px] text-ink-mut">
              {t("admin.templates.folder")}
            </span>
            <input className={field} value={draft.folder} onChange={(e) => set("folder", e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="block text-[12px] text-ink-mut">
            {t("admin.templates.description")}
          </span>
          <input className={field} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-[12px] text-ink-mut">
            {t("admin.templates.tagsLabel")}
          </span>
          <input
            className={field}
            value={draft.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder={t("admin.templates.tagsPlaceholder")}
          />
        </label>
        <label className="block">
          <span className="block text-[12px] text-ink-mut">
            {t("admin.templates.contentLabel", {
              titleTag: "{{title}}",
              dateTag: "{{date}}",
              authorTag: "{{author}}",
            })}
          </span>
          <textarea
            className={`${field} min-h-72 font-mono`}
            value={draft.content}
            onChange={(e) => set("content", e.target.value)}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-md bg-ink-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
          >
            {pending
              ? t("common.saving")
              : draft.id
                ? t("admin.templates.saveChanges")
                : t("admin.templates.createTemplate")}
          </button>
          {draft.id && canDelete && (
            <button
              onClick={remove}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-line px-3 py-1.5 text-[13px] text-ink-mut hover:border-red-400 hover:text-red-600 disabled:opacity-60"
            >
              <FaTrashCan className="text-[11px]" /> {t("common.delete")}
            </button>
          )}
          <span className="text-[12px] text-ink-mut">
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : savedAt ? (
              t("editor.savedAt", { time: savedAt })
            ) : (
              ""
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
