import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaPlus } from "react-icons/fa6";

/**
 * Single-select folder picker with nested ("/"-delimited) folders: pick an
 * existing folder (shown indented by depth) or create a sub-folder by choosing
 * a parent + typing a new segment.
 */
export default function FolderPicker({
  value,
  onChange,
  folders,
}: {
  value: string;
  onChange: (folder: string) => void;
  folders: string[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [parent, setParent] = useState("");
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const options = [
    ...new Set([...folders, ...(value ? [value] : [])].filter(Boolean)),
  ].sort();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (f: string) => {
    onChange(f);
    setOpen(false);
  };

  const addFolder = () => {
    // Allow typing a full "a/b" path in the name box too.
    const segs = name.split("/").map((s) => s.trim()).filter(Boolean);
    if (segs.length === 0) return;
    const child = segs.join("/");
    const path = parent ? `${parent}/${child}` : child;
    setName("");
    pick(path);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-44 items-center justify-between gap-2 rounded-md border border-ink-line bg-ink-panel px-2.5 pb-1 pt-1.5 text-left text-[12px] outline-none transition-colors hover:border-ink-accent"
      >
        <span className="truncate">{value || t("admin.folderPicker.root")}</span>
        <FaChevronDown className="shrink-0 text-[10px] text-ink-mut" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-md border border-ink-line bg-ink-panel p-1 shadow-lg">
          <button
            type="button"
            onClick={() => pick("")}
            className={`block w-full rounded px-2 py-1 text-left text-[12px] hover:bg-black/[0.04] ${
              !value ? "font-medium text-ink-accent" : ""
            }`}
          >
            {t("admin.folderPicker.root")}
          </button>
          {options.map((f) => {
            const depth = f.split("/").length - 1;
            const leaf = f.split("/").pop() ?? f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => pick(f)}
                title={f}
                style={{ paddingLeft: `${0.5 + depth * 0.9}rem` }}
                className={`block w-full truncate rounded py-1 pr-2 text-left text-[12px] hover:bg-black/[0.04] ${
                  value === f ? "font-medium text-ink-accent" : ""
                }`}
              >
                {depth > 0 && <span className="text-ink-mut">↳ </span>}
                {leaf}
              </button>
            );
          })}

          {/* create sub-folder: parent + new segment */}
          <div className="mt-1 space-y-1 border-t border-ink-line p-1">
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="w-full rounded border border-ink-line bg-ink-panel px-1 py-0.5 text-[11px] outline-none focus:border-ink-accent"
            >
              <option value="">{t("admin.folderPicker.underRoot")}</option>
              {options.map((f) => (
                <option key={f} value={f}>
                  {t("admin.folderPicker.under", { folder: f })}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFolder();
                  }
                }}
                placeholder={t("admin.folderPicker.newFolderName")}
                className="w-full rounded border border-ink-line px-2 py-0.5 text-[11px] outline-none focus:border-ink-accent"
              />
              <button
                type="button"
                onClick={addFolder}
                aria-label={t("admin.folderPicker.createFolder")}
                className="rounded bg-ink-accent px-2 text-white hover:bg-ink-accentHover"
              >
                <FaPlus className="text-[10px]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
