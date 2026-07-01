import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FaGear } from "react-icons/fa6";
import { LANGUAGES, ROLES, type AppSettings, type Role } from "@/lib/types";
import { fetchSettings } from "@/spa/data/settings";
import {
  exportArticles,
  importArticles,
  updateSettings,
  type ImportResult,
} from "@/spa/data/writes";
import { useAsync } from "@/spa/data/useAsync";
import Loading from "@/spa/pages/Loading";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-line bg-ink-panel p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-[12px] text-ink-mut">{hint}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="block text-[12px] text-ink-mut">{hint}</span>}
      </span>
      <span className="shrink-0">{children}</span>
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-ink-accent" : "bg-ink-line"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

const INPUT =
  "rounded-md border border-ink-line bg-ink-bg px-2.5 py-1 text-[13px] outline-none focus:border-ink-accent";

const BTN =
  "rounded-md border border-ink-line px-3 py-1.5 text-[13px] font-medium hover:border-ink-accent hover:text-ink-accent disabled:opacity-60";

/** Bulk import/export — self-contained (acts immediately, not part of Save). */
function ImportExport() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doExport = async () => {
    setError(null);
    setExporting(true);
    try {
      await exportArticles();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const doImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setResult(null);
    setImporting(true);
    try {
      setResult(await importArticles([...files]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Section title={t("admin.settings.sections.importExport")}>
      <Row label={t("admin.settings.importExport.exportLabel")} hint={t("admin.settings.importExport.exportHint")}>
        <button type="button" className={BTN} onClick={doExport} disabled={exporting}>
          {exporting ? t("admin.settings.importExport.exporting") : t("admin.settings.importExport.export")}
        </button>
      </Row>
      <Row label={t("admin.settings.importExport.importLabel")} hint={t("admin.settings.importExport.importHint")}>
        <span>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.zip"
            multiple
            className="hidden"
            onChange={(e) => doImport(e.target.files)}
          />
          <button
            type="button"
            className={BTN}
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            {importing ? t("admin.settings.importExport.importing") : t("admin.settings.importExport.import")}
          </button>
        </span>
      </Row>
      {result && (
        <p className="text-[13px] text-emerald-600">
          {t("admin.settings.importExport.result", { imported: result.imported, total: result.total })}
          {result.errors.length > 0 && (
            <span className="text-amber-600">
              {" "}
              {t("admin.settings.importExport.failed", { count: result.errors.length })}
            </span>
          )}
        </p>
      )}
      {error && <p className="text-[13px] text-red-600">{error}</p>}
    </Section>
  );
}

/** Admin-only app settings. */
export default function SettingsPage() {
  const { t } = useTranslation();
  const { data, loading } = useAsync(fetchSettings, []);
  const [form, setForm] = useState<AppSettings | null>(null);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (loading || !form) return <Loading />;
  const f = form;
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const save = () => {
    setError(null);
    start(async () => {
      const res = await updateSettings(f);
      if (res.ok) setSaved(true);
      else setError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <FaGear className="text-ink-accent" /> {t("admin.settings.title")}
      </h1>
      <p className="mt-1 text-[13px] text-ink-mut">{t("admin.settings.subtitle")}</p>

      <div className="mt-6 space-y-5">
        <Section title={t("admin.settings.sections.branding")}>
          <Row label={t("admin.settings.branding.siteName")} hint={t("admin.settings.branding.siteNameHint")}>
            <input className={INPUT} value={f.siteName} onChange={(e) => set("siteName", e.target.value)} />
          </Row>
          <Row label={t("admin.settings.branding.tagline")}>
            <input className={INPUT} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Row>
          <Row label={t("admin.settings.branding.accentColor")}>
            <input type="color" className="h-7 w-10 rounded border border-ink-line bg-ink-bg" value={f.accentColor} onChange={(e) => set("accentColor", e.target.value)} />
          </Row>
          <Row label={t("admin.settings.branding.defaultTheme")}>
            <select className={INPUT} value={f.defaultTheme} onChange={(e) => set("defaultTheme", e.target.value as AppSettings["defaultTheme"])}>
              <option value="system">{t("theme.system")}</option>
              <option value="light">{t("theme.light")}</option>
              <option value="dark">{t("theme.dark")}</option>
            </select>
          </Row>
        </Section>

        <Section title={t("admin.settings.sections.publishing")}>
          <Row label={t("admin.settings.publishing.requireReview")} hint={t("admin.settings.publishing.requireReviewHint")}>
            <Toggle checked={f.requireReview} onChange={(v) => set("requireReview", v)} />
          </Row>
          <Row label={t("admin.settings.publishing.allowAdminSelfReview")} hint={t("admin.settings.publishing.allowAdminSelfReviewHint")}>
            <Toggle checked={f.allowAdminSelfReview} onChange={(v) => set("allowAdminSelfReview", v)} />
          </Row>
        </Section>

        <Section title={t("admin.settings.sections.languages")}>
          <Row label={t("admin.settings.languages.enabled")}>
            <span className="flex gap-3">
              {LANGUAGES.map((l) => (
                <label key={l.code} className="flex items-center gap-1 text-[13px]">
                  <input
                    type="checkbox"
                    checked={f.enabledLanguages.includes(l.code)}
                    onChange={(e) =>
                      set(
                        "enabledLanguages",
                        e.target.checked
                          ? [...new Set([...f.enabledLanguages, l.code])]
                          : f.enabledLanguages.filter((c) => c !== l.code),
                      )
                    }
                  />
                  {l.code.toUpperCase()}
                </label>
              ))}
            </span>
          </Row>
          <Row label={t("admin.settings.languages.fallback")}>
            <Toggle checked={f.fallbackToSource} onChange={(v) => set("fallbackToSource", v)} />
          </Row>
          <Row label={t("admin.settings.languages.requireLogin")}>
            <Toggle checked={f.requireLoginToRead} onChange={(v) => set("requireLoginToRead", v)} />
          </Row>
          <Row label={t("admin.settings.languages.defaultRole")}>
            <select className={INPUT} value={f.defaultUserRole} onChange={(e) => set("defaultUserRole", e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Row>
        </Section>

        <Section title={t("admin.settings.sections.editor")}>
          <Row label={t("admin.settings.editor.defaultView")}>
            <select className={INPUT} value={f.defaultEditorView} onChange={(e) => set("defaultEditorView", e.target.value as AppSettings["defaultEditorView"])}>
              <option value="edit">{t("admin.settings.editor.viewEdit")}</option>
              <option value="live">{t("admin.settings.editor.viewSplit")}</option>
              <option value="preview">{t("admin.settings.editor.viewPreview")}</option>
            </select>
          </Row>
          <Row label={t("admin.settings.editor.tags")}><Toggle checked={f.tagsEnabled} onChange={(v) => set("tagsEnabled", v)} /></Row>
          <Row label={t("admin.settings.editor.askAi")}><Toggle checked={f.askAiEnabled} onChange={(v) => set("askAiEnabled", v)} /></Row>
          <Row label={t("admin.settings.editor.feedback")}><Toggle checked={f.feedbackWidget} onChange={(v) => set("feedbackWidget", v)} /></Row>
          <Row label={t("admin.settings.editor.suggestEdits")}><Toggle checked={f.suggestEdits} onChange={(v) => set("suggestEdits", v)} /></Row>
          <Row label={t("admin.settings.editor.viewTracking")}><Toggle checked={f.viewTracking} onChange={(v) => set("viewTracking", v)} /></Row>
          <Row label={t("admin.settings.editor.searchLogging")}><Toggle checked={f.searchLogging} onChange={(v) => set("searchLogging", v)} /></Row>
        </Section>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-md bg-ink-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-accentHover disabled:opacity-60"
        >
          {pending ? t("admin.settings.saving") : t("admin.settings.save")}
        </button>
        {saved && <span className="text-[13px] text-emerald-600">{t("admin.settings.saved")}</span>}
        {error && <span className="text-[13px] text-red-600">{error}</span>}
      </div>

      <div className="mt-8 border-t border-ink-line pt-6">
        <ImportExport />
      </div>
    </div>
  );
}
