import {
  FaCompress,
  FaExpand,
  FaEye,
  FaFeather,
  FaPen,
  FaTableColumns,
} from "react-icons/fa6";
import type { PreviewType } from "@uiw/react-md-editor";

// Editor / split / preview view switcher options for the toolbar.
const VIEW_MODES: { id: PreviewType; label: string; Icon: typeof FaPen }[] = [
  { id: "edit", label: "Editor only", Icon: FaPen },
  { id: "live", label: "Split", Icon: FaTableColumns },
  { id: "preview", label: "Preview only", Icon: FaEye },
];

// Lightweight CSS tooltip: fades + slides in on hover/keyboard-focus. Replaces
// the native `title` so the styling matches the app and it appears instantly.
export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-[90] mt-2 -translate-x-1/2 translate-y-0.5 whitespace-nowrap rounded-md border border-ink-line bg-ink-panel px-2 py-1 text-[11px] font-medium text-ink-mut opacity-0 shadow-lg transition-all duration-150 group-hover/tt:translate-y-0 group-hover/tt:opacity-100 group-focus-within/tt:translate-y-0 group-focus-within/tt:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

export function ViewToggle({
  value,
  onChange,
}: {
  value: PreviewType;
  onChange: (v: PreviewType) => void;
}) {
  const last = VIEW_MODES.length - 1;
  return (
    <div className="flex rounded-md border border-ink-line">
      {VIEW_MODES.map(({ id, label, Icon }, i) => (
        <Tooltip key={id} label={label}>
          <button
            type="button"
            onClick={() => onChange(id)}
            aria-label={label}
            aria-pressed={value === id}
            className={`px-2 py-1.5 text-[12px] transition-colors ${
              i === 0 ? "rounded-l-md" : ""
            } ${i === last ? "rounded-r-md" : ""} ${
              value === id
                ? "bg-ink-accent text-white"
                : "text-ink-mut hover:text-ink-accent"
            }`}
          >
            <Icon />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

// View switcher + fullscreen + zen, grouped for the metadata row.
export default function ViewControls({
  previewMode,
  setPreviewMode,
  fullscreen,
  setFullscreen,
  setZen,
}: {
  previewMode: PreviewType;
  setPreviewMode: (v: PreviewType) => void;
  fullscreen: boolean;
  setFullscreen: (fn: (v: boolean) => boolean) => void;
  setZen: (v: boolean) => void;
}) {
  const iconBtn =
    "rounded-md border border-ink-line px-2 py-1.5 text-[12px] text-ink-mut transition-colors hover:border-ink-accent hover:text-ink-accent";
  return (
    <div className="flex items-center gap-2">
      <ViewToggle value={previewMode} onChange={setPreviewMode} />
      <Tooltip label={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}>
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className={iconBtn}
        >
          {fullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </Tooltip>
      <Tooltip label="Zen mode (Esc to exit)">
        <button
          type="button"
          onClick={() => setZen(true)}
          aria-label="Enter zen mode"
          className={iconBtn}
        >
          <FaFeather />
        </button>
      </Tooltip>
    </div>
  );
}
