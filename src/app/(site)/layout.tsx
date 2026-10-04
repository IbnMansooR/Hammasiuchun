import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreProvider from "@/components/StoreProvider";
import PreviewProvider from "@/components/PreviewProvider";
import { getCurrentUser, unreadNotifications } from "@/lib/userAuth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const unread = user ? await unreadNotifications(user.id) : 0;
  return (
    <StoreProvider>
      <PreviewProvider>
        <a href="#main" className="skip-link">Asosiy qismga oʻtish</a>
        <Header user={user} unread={unread} />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
      </PreviewProvider>
    </StoreProvider>
  );
}
