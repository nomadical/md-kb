import { useOutletContext } from "react-router-dom";
import KbBrowser from "@/components/KbBrowser";
import type { PublicOutletContext } from "@/spa/pages/public/PublicLayout";
import Loading from "@/spa/pages/Loading";

/** SPA port of src/app/(public)/kb/page.tsx. */
export default function KbBrowsePage() {
  const { articles, loading } = useOutletContext<PublicOutletContext>();
  if (loading) return <Loading />;
  return <KbBrowser articles={articles} />;
}
