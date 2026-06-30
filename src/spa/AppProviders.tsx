import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import HotkeysProvider from "@/components/HotkeysProvider";
import { AuthProvider } from "@/spa/auth/AuthProvider";
import { SettingsProvider } from "@/spa/data/settings";
import Loading from "@/spa/pages/Loading";

/**
 * Root layout element: the provider tree that wrapped the app in Next's
 * RootLayout (Theme + Hotkeys) plus the SPA AuthProvider, with an <Outlet/> for
 * the matched route.
 */
export default function AppProviders() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <HotkeysProvider>
          <AuthProvider>
            {/* Suspense boundary for the lazily-loaded route chunks. */}
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </AuthProvider>
        </HotkeysProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
