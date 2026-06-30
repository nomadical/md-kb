import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "@/components/ui/AppLink";
import { usePathname } from "@/components/ui/navigation";
import { FaChevronDown, FaChevronRight } from "react-icons/fa6";
import type { ArticleMeta } from "@/lib/types";

type TreeNode = {
  name: string;
  path: string;
  folders: Map<string, TreeNode>;
  files: ArticleMeta[];
};

function emptyNode(name: string, path: string): TreeNode {
  return { name, path, folders: new Map(), files: [] };
}

function buildTree(items: ArticleMeta[]): TreeNode {
  const root = emptyNode("", "");
  for (const item of items) {
    const segments = (item.folder || "").split("/").map((s) => s.trim()).filter(Boolean);
    let node = root;
    let acc = "";
    for (const seg of segments) {
      acc = acc ? `${acc}/${seg}` : seg;
      if (!node.folders.has(seg)) node.folders.set(seg, emptyNode(seg, acc));
      node = node.folders.get(seg)!;
    }
    node.files.push(item);
  }
  return root;
}

function Folder({
  node,
  activePath,
  href,
  depth,
}: {
  node: TreeNode;
  activePath: string;
  href: (a: ArticleMeta) => string;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  return (
    <div>
      {node.name && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[13px] font-medium text-ink-mut hover:bg-black/[0.04]"
          style={pad}
        >
          <span className="inline-flex w-3 justify-center text-[9px]">
            {open ? <FaChevronDown /> : <FaChevronRight />}
          </span>
          {node.name}
        </button>
      )}
      {open && (
        <>
          {[...node.folders.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <Folder
                key={child.path}
                node={child}
                activePath={activePath}
                href={href}
                depth={depth + 1}
              />
            ))}
          {node.files.map((file) => {
            const active = href(file) === activePath;
            return (
              <Link
                key={file.id}
                href={href(file)}
                className={`flex items-center gap-2 rounded px-2 py-1 text-[13px] ${
                  active
                    ? "bg-ink-accent/10 font-medium text-ink-accent"
                    : "text-ink-fg hover:bg-black/[0.04]"
                }`}
                style={{ paddingLeft: `${(depth + (node.name ? 1 : 0)) * 12 + 22}px` }}
              >
                <span className="truncate">{file.title}</span>
                {!file.published && (
                  <span className="ml-auto shrink-0 rounded bg-amber-100 px-1 text-[10px] text-amber-700">
                    draft
                  </span>
                )}
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}

export default function ArticleTree({
  items,
  basePath,
  linkKey,
}: {
  items: ArticleMeta[];
  /** URL prefix for each article link, e.g. "/kb" or "/admin". */
  basePath: string;
  /** Which field forms the last URL segment. */
  linkKey: "slug" | "id";
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const activePath = usePathname();
  const href = (a: ArticleMeta) => `${basePath}/${a[linkKey]}`;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.folder.toLowerCase().includes(needle) ||
        a.tags.some((t) => t.toLowerCase().includes(needle)),
    );
  }, [items, q]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("common.searchPlaceholder")}
          className="w-full rounded-md border border-ink-line bg-ink-bg px-2.5 py-1.5 text-[13px] outline-none focus:border-ink-accent"
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-1 pb-4">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-[13px] text-ink-mut">{t("common.noArticles")}</p>
        ) : (
          <Folder node={tree} activePath={activePath} href={href} depth={0} />
        )}
      </nav>
    </div>
  );
}
