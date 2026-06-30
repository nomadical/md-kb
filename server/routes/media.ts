import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { HttpError, requireRole } from "../auth";
import { adminClient } from "../supabase";

// Port of /api/upload, /api/track, /api/search.
const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const BUCKET = "kb-images";
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
]);

r.post("/upload", upload.single("file"), async (req, res) => {
  try {
    await requireRole(req, "admin", "editor");
    const admin = adminClient();
    if (!admin) throw new HttpError(500, "Storage not configured");
    const file = req.file;
    if (!file) throw new HttpError(400, "No file");
    if (!ALLOWED.has(file.mimetype)) throw new HttpError(415, `Unsupported type: ${file.mimetype}`);

    const ext = (file.originalname.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw new HttpError(502, error.message);
    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    res.json({ url: data.publicUrl });
  } catch (e) {
    if (e instanceof HttpError) res.status(e.status).json({ error: e.message });
    else res.status(500).json({ error: (e as Error).message });
  }
});

// Anonymous analytics beacons — always 204, never surface errors. Service-role
// insert (these tables are insert-only / staff-read).
const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 64) : null);

r.post("/track", async (req, res) => {
  const b = req.body ?? {};
  const path = typeof b.path === "string" ? b.path.slice(0, 512) : null;
  if (path) {
    const dwell =
      typeof b.dwellMs === "number" && Number.isFinite(b.dwellMs)
        ? Math.min(Math.max(Math.round(b.dwellMs), 0), 86_400_000)
        : null;
    const admin = adminClient();
    if (admin)
      await admin
        .from("page_views")
        .insert({ path, visitor_id: str(b.visitorId), session_id: str(b.sessionId), dwell_ms: dwell })
        .then(() => {});
  }
  res.status(204).end();
});

r.post("/search", async (req, res) => {
  const b = req.body ?? {};
  const articleId = typeof b.articleId === "string" ? b.articleId : null;
  if (articleId) {
    const query = typeof b.query === "string" ? b.query.slice(0, 256) : null;
    const admin = adminClient();
    if (admin)
      await admin.from("search_result_clicks").insert({ query, article_id: articleId }).then(() => {});
  }
  res.status(204).end();
});

export default r;
