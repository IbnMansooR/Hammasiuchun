import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreProvider from "@/components/StoreProvider";
import { getCurrentUser } from "@/lib/userAuth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <StoreProvider>
      <a href="#main" className="skip-link">Asosiy qismga oʻtish</a>
      <Header user={user} />
      <main id="main" tabIndex={-1}>{children}</main>
      <Footer />
    </StoreProvider>
  );
}
