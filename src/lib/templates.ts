export type Template = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  folder: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const TEMPLATE_COLUMNS =
  "id,name,description,content,folder,tags,created_by,created_at,updated_at";

/** Substitute {{title}} / {{date}} / {{author}} placeholders in template content. */
export function applyTemplate(
  content: string,
  vars: { title?: string; author?: string; date?: Date } = {},
): string {
  const date = (vars.date ?? new Date()).toLocaleDateString();
  return content
    .replaceAll("{{title}}", vars.title ?? "")
    .replaceAll("{{date}}", date)
    .replaceAll("{{author}}", vars.author ?? "");
}
