import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown } from "react-icons/fa6";
import { ENTITLEMENT_ROLES } from "@/lib/types";

/**
 * Multi-select dropdown for an article's entitlement roles. Replaces the old
 * free-text field — pick from the known realm vocabulary, with a free-text
 * "add custom" escape hatch for roles not in the list yet.
 */
export default function AccessRolePicker({
  value,
  onChange,
  allowedRoles,
}: {
  value: string[];
  onChange: (roles: string[]) => void;
  /** When set (editors), restrict choices to these roles (+ BASIC_ACCESS) and
   *  hide the free-text escape hatch — admins pass undefined for the full list. */
  allowedRoles?: string[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Admin: full vocabulary + custom. Editor: only roles they hold (+ public),
  // plus whatever is already on the article so existing tags remain visible.
  const base = allowedRoles
    ? ["BASIC_ACCESS", ...allowedRoles]
    : [...ENTITLEMENT_ROLES];
  const options = [
    ...new Set([...base, ...value]),
  ];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (role: string) =>
    onChange(
      value.includes(role) ? value.filter((r) => r !== role) : [...value, role],
    );

  const addCustom = () => {
    const r = custom.trim().toUpperCase();
    if (r && !value.includes(r)) onChange([...value, r]);
    setCustom("");
  };

  const label =
    value.length === 0
      ? t("admin.accessRolePicker.publicNoRoles")
      : t("admin.accessRolePicker.roleCount", { count: value.length });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-44 items-center justify-between gap-2 rounded-md border border-ink-line bg-ink-panel px-2.5 pb-1 pt-1.5 text-left text-[12px] outline-none transition-colors hover:border-ink-accent"
      >
        <span className="truncate">{label}</span>
        <FaChevronDown className="shrink-0 text-[10px] text-ink-mut" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-md border border-ink-line bg-ink-panel p-1 shadow-lg">
          {options.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12px] hover:bg-black/[0.04]"
            >
              <input
                type="checkbox"
                checked={value.includes(role)}
                onChange={() => toggle(role)}
              />
              <span className="font-mono">{role}</span>
            </label>
          ))}
          {allowedRoles === undefined && (
            <div className="mt-1 flex gap-1 border-t border-ink-line p-1">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder={t("admin.accessRolePicker.addCustomRole")}
                className="w-full rounded border border-ink-line px-2 py-0.5 font-mono text-[11px] outline-none focus:border-ink-accent"
              />
              <button
                type="button"
                onClick={addCustom}
                className="rounded bg-ink-accent px-2 text-[12px] text-white hover:bg-ink-accentHover"
              >
                +
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
