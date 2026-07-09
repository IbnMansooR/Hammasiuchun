import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreProvider from "@/components/StoreProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </StoreProvider>
  );
}
