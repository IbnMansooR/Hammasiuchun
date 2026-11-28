"use client";
// next/link that keeps the visitor in their language: "/fonts" becomes "/ru/fonts" on Russian pages.
import Link from "next/link";
import { forwardRef } from "react";
import { useLocale } from "@/i18n/client";
import { withLocale } from "@/i18n/config";

type Props = React.ComponentProps<typeof Link>;

const LLink = forwardRef<HTMLAnchorElement, Props>(function LLink({ href, ...rest }, ref) {
  const locale = useLocale();
  const to = typeof href === "string" ? withLocale(locale, href) : href;
  return <Link ref={ref} href={to} {...rest} />;
});

export default LLink;
