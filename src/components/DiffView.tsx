import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type Line = { type: "add" | "del" | "ctx"; text: string };

// Classic LCS line diff. Bounded so a huge pair can't blow up memory/time.
const MAX_CELLS = 4_000_000; // ~2000 x 2000 lines

function diffLines(a: string, b: string): Line[] | null {
  const A = a.split("\n");
  const B = b.split("\n");
  const n = A.length;
  const m = B.length;
  if (n * m > MAX_CELLS) return null; // too large — caller shows a fallback
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from<number>({ length: m + 1 }).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        A[i] === B[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: Line[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ type: "ctx", text: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: A[i] });
      i++;
    } else {
      out.push({ type: "add", text: B[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: A[i++] });
  while (j < m) out.push({ type: "add", text: B[j++] });
  return out;
}

/** Line-level diff between two markdown bodies (base → next). */
export default function DiffView({ base, next }: { base: string; next: string }) {
  const { t } = useTranslation();
  const lines = useMemo(() => diffLines(base, next), [base, next]);

  if (lines === null) {
    return <p className="text-[13px] text-ink-mut">{t("admin.diff.tooLarge")}</p>;
  }

  const added = lines.filter((l) => l.type === "add").length;
  const removed = lines.filter((l) => l.type === "del").length;

  if (added === 0 && removed === 0) {
    return <p className="text-[13px] text-ink-mut">{t("admin.diff.noChanges")}</p>;
  }

  return (
    <div>
      <div className="mb-2 text-[12px] text-ink-mut">
        <span className="text-green-700">+{added}</span>{" "}
        <span className="text-red-700">−{removed}</span>{" "}
        {t("admin.diff.sinceLastPublished")}
      </div>
      <div className="overflow-x-auto rounded-lg border border-ink-line font-mono text-[12.5px] leading-5">
        {/* Static, append-only diff list — positional key is correct here. */}
        {/* eslint-disable-next-line react/no-array-index-key */}
        {lines.map((l, idx) => (
          <div
            key={idx}
            className={
              l.type === "add"
                ? "whitespace-pre-wrap bg-green-500/10 px-3 text-green-800"
                : l.type === "del"
                  ? "whitespace-pre-wrap bg-red-500/10 px-3 text-red-800"
                  : "whitespace-pre-wrap px-3 text-ink-mut"
            }
          >
            <span className="select-none pr-2 opacity-60">
              {l.type === "add" ? "+" : l.type === "del" ? "−" : " "}
            </span>
            {l.text || " "}
          </div>
        ))}
      </div>
    </div>
  );
}
