"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageView, wireVisibility } from "@/lib/trackClient";

/** Reports page views and time on page. Renders nothing; lives in the public layout only. */
export default function Analytics() {
  const pathname = usePathname();
  useEffect(() => { wireVisibility(); }, []);
  useEffect(() => { if (pathname) trackPageView(pathname); }, [pathname]);
  return null;
}
