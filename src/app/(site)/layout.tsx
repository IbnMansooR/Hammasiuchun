import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import SavePrompt from "@/components/SavePrompt";
import StoreProvider from "@/components/StoreProvider";
import PreviewProvider from "@/components/PreviewProvider";
import { getCurrentUser, unreadNotifications } from "@/lib/userAuth";
import { LocaleProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const unread = user ? await unreadNotifications(user.id) : 0;
  const locale = await getLocale();
  return (
    <LocaleProvider locale={locale}>
    <StoreProvider signedIn={!!user}>
      <PreviewProvider>
        <a href="#main" className="skip-link">{DICTS[locale].layout.skip}</a>
        <Header user={user} unread={unread} />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        <Analytics />
        {!user && <SavePrompt />}
      </PreviewProvider>
    </StoreProvider>
    </LocaleProvider>
  );
}
