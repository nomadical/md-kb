/** Modal list of templates to insert at the caret. */
export default function TemplatePickerModal({
  templates,
  onPick,
  onClose,
}: {
  templates: { id: string; name: string; content: string }[];
  onPick: (content: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[18vh]"
      onClick={onClose}
    >
      <div className="kb-fade absolute inset-0 bg-black/40" />
      <div
        className="kb-pop relative w-full max-w-md overflow-hidden rounded-xl border border-ink-line bg-ink-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-ink-line px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-ink-mut">
          Insert template
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {templates.map((tpl) => (
            <li key={tpl.id}>
              <button
                onClick={() => onPick(tpl.content)}
                className="block w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-ink-accent/10 hover:text-ink-accent"
              >
                {tpl.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
