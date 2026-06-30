import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router-dom";

type AppLinkProps = Omit<LinkProps, "to"> & { href: string };

/**
 * Drop-in replacement for `next/link` during the Vite migration: accepts a
 * Next-style `href` and renders a react-router <Link to={href}>. Shared
 * components switch from next/link with only an import change (usage keeps
 * `<Link href=...>`), avoiding a body rewrite per component.
 */
const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink(
  { href, ...rest },
  ref,
) {
  return <RouterLink ref={ref} to={href} {...rest} />;
});

export default AppLink;
