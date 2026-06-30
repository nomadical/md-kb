import { useTranslation } from "react-i18next";
import Link from "@/components/ui/AppLink";
import { useSettings } from "@/spa/data/settings";
import { FaCube } from "react-icons/fa6";

/** Site footer with quick links (branding from admin settings). */
export default function Footer() {
  const { t } = useTranslation();
  const { askAiEnabled, siteName } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-ink-line bg-ink-panel">
      <div className="mx-auto w-full max-w-440 px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* brand */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <FaCube className="text-ink-accent" />
              {siteName}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-mut">
              {t("footer.tagline")}
            </p>
          </div>

          {/* links */}
          <div className="grid grid-cols-2 gap-10 text-[13px]">
            <nav>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mut">
                {t("nav.knowledgeBase")}
              </p>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-ink-mut hover:text-ink-accent">
                    {t("nav.home")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kb"
                    className="text-ink-mut hover:text-ink-accent"
                  >
                    {t("common.browseAll")}
                  </Link>
                </li>
                {askAiEnabled && (
                  <li>
                    <Link
                      href="/?ai=1"
                      className="text-ink-mut hover:text-ink-accent"
                    >
                      {t("nav.askKb")}
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-line pt-5 text-[12px] text-ink-mut">
          {t("footer.rights", { year })}
        </div>
      </div>
    </footer>
  );
}
