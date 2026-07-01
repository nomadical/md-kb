import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { BASE_PATH as BP } from "@/lib/config";
import type { EditRange } from "@/components/editor/editorText";

interface Args {
  clearError: () => void;
  setContent: Dispatch<SetStateAction<string>>;
  pushToast: (kind: "success" | "error", message: string) => void;
}

/**
 * Image/video upload for the editor: uploads to Supabase Storage via
 * `/api/upload` and inserts the result at the caret (images/GIFs as markdown
 * image links, videos as a sanitizer-friendly <video> tag). Exposes the
 * in-flight flag plus the insert action; the caller wires the file input,
 * paste, and drop handlers.
 */
export function useMediaUpload({ clearError, setContent, pushToast }: Args) {
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`${BP}/api/upload`, { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
    return json.url as string;
  }, []);

  const insertImages = useCallback(
    async (files: FileList | File[], pos?: EditRange) => {
      const media = Array.from(files).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
      );
      if (media.length === 0) return;
      clearError();
      setUploading(true);
      try {
        const urls = await Promise.all(media.map(uploadImage));
        const md = urls
          .map((u, i) =>
            media[i].type.startsWith("video/")
              ? `<video src="${u}" controls width="640" style="max-width:100%"></video>`
              : `![${media[i].name.replace(/\.[^.]+$/, "")}](${u})`,
          )
          .join("\n");
        setContent((prev) => {
          const start = pos?.start ?? prev.length;
          const end = pos?.end ?? start;
          return prev.slice(0, start) + md + prev.slice(end);
        });
        pushToast(
          "success",
          media.length > 1
            ? `${media.length} files uploaded`
            : `${media[0].type.startsWith("video/") ? "Video" : "Image"} uploaded`,
        );
      } catch (e) {
        pushToast("error", `Upload failed: ${(e as Error).message}`);
      } finally {
        setUploading(false);
      }
    },
    [uploadImage, pushToast, clearError, setContent],
  );

  return { uploading, insertImages };
}
