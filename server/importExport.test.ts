import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import JSZip from "jszip";
import {
  articleToMarkdownFile,
  parseMarkdownImport,
  normalizeFolder,
} from "./importExport";

const base = {
  slug: "hello",
  title: "Hello World",
  folder: "Guides/Intro",
  tags: ["a", "b"],
  access_roles: ["INTERNAL"],
  context_keys: [],
  content: "# Hello World\n\nBody text.",
  status: "published",
};

describe("articleToMarkdownFile", () => {
  it("nests the file under its folder and appends .md", () => {
    expect(articleToMarkdownFile(base).path).toBe("Guides/Intro/hello.md");
  });
  it("puts folderless articles at the root", () => {
    expect(articleToMarkdownFile({ ...base, folder: "" }).path).toBe("hello.md");
  });
  it("writes round-trippable frontmatter", () => {
    const { contents } = articleToMarkdownFile(base);
    const { data, content } = matter(contents);
    expect(data.title).toBe("Hello World");
    expect(data.tags).toEqual(["a", "b"]);
    expect(data.access_roles).toEqual(["INTERNAL"]);
    expect(content.trim()).toBe("# Hello World\n\nBody text.");
  });
  it("omits empty optional fields from frontmatter", () => {
    const { contents } = articleToMarkdownFile({ ...base, tags: [], access_roles: [] });
    const { data } = matter(contents);
    expect(data.tags).toBeUndefined();
    expect(data.access_roles).toBeUndefined();
  });
  it("sanitizes path traversal out of slug/folder", () => {
    const { path } = articleToMarkdownFile({ ...base, slug: "../evil", folder: "../../etc" });
    expect(path).not.toContain("..");
    expect(path).not.toMatch(/^\//);
  });
});

describe("parseMarkdownImport", () => {
  it("reads frontmatter over everything else", () => {
    const raw = matter.stringify("Body", {
      title: "From FM",
      slug: "fm-slug",
      folder: "X/Y",
      tags: ["t1"],
      access_roles: ["staff"],
    });
    const p = parseMarkdownImport("ignored/path.md", raw);
    expect(p).toMatchObject({
      title: "From FM",
      slug: "fm-slug",
      folder: "X/Y",
      tags: ["t1"],
      access_roles: ["STAFF"], // upper-cased
    });
  });

  it("falls back to the first H1 for the title, and derives folder+slug", () => {
    const p = parseMarkdownImport("Guides/Getting Started.md", "# Getting Started\n\nHi");
    expect(p.title).toBe("Getting Started");
    expect(p.slug).toBe("getting-started");
    expect(p.folder).toBe("Guides");
    expect(p.content).toBe("# Getting Started\n\nHi");
  });

  it("falls back to the filename when there's no title or H1", () => {
    const p = parseMarkdownImport("notes.md", "just body");
    expect(p.title).toBe("notes");
    expect(p.slug).toBe("notes");
  });

  it("accepts comma-separated tags/roles as a string", () => {
    const raw = matter.stringify("b", { title: "T", tags: "x, y ,z" });
    expect(parseMarkdownImport("f.md", raw).tags).toEqual(["x", "y", "z"]);
  });
});

describe("normalizeFolder", () => {
  it("trims and collapses separators", () => {
    expect(normalizeFolder(" A // B / ")).toBe("A/B");
  });
});

describe("export → zip → import round-trip", () => {
  it("preserves title, folder, tags, roles and body through JSZip", async () => {
    const articles = [
      { ...base },
      { ...base, slug: "faq", title: "FAQ", folder: "", tags: [], access_roles: [], content: "Q&A" },
    ];
    const zip = new JSZip();
    for (const a of articles) {
      const { path, contents } = articleToMarkdownFile(a);
      zip.file(path, contents);
    }
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const reloaded = await JSZip.loadAsync(bytes);
    const parsed = [];
    for (const entry of Object.values(reloaded.files)) {
      if (entry.dir || !/\.md$/i.test(entry.name)) continue;
      parsed.push(parseMarkdownImport(entry.name, await entry.async("string")));
    }
    parsed.sort((a, b) => a.slug.localeCompare(b.slug));

    expect(parsed).toHaveLength(2);
    const faq = parsed.find((p) => p.slug === "faq")!;
    expect(faq).toMatchObject({ title: "FAQ", folder: "", tags: [], access_roles: [] });
    const hello = parsed.find((p) => p.slug === "hello")!;
    expect(hello).toMatchObject({
      title: "Hello World",
      folder: "Guides/Intro",
      tags: ["a", "b"],
      access_roles: ["INTERNAL"],
    });
    expect(hello.content.trim()).toBe("# Hello World\n\nBody text.");
  });
});
