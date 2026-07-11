import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreProvider from "@/components/StoreProvider";
import { getCurrentUser } from "@/lib/userAuth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <StoreProvider>
      <Header user={user} />
      <main>{children}</main>
      <Footer />
    </StoreProvider>
  );
}
