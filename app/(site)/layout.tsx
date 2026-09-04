import Header       from "@/components/layout/Header";
import Footer        from "@/components/layout/Footer";
import Backdrop        from "@/components/layout/Backdrop";
import AppProviders      from "@/components/layout/AppProviders";
import PageContent         from "@/components/layout/PageContent";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <a href="#main-content" className="skip-link sr-only">
        Skip to main content
      </a>
      <Header />
      <PageContent>{children}</PageContent>
      <Footer />
      <Backdrop />
    </AppProviders>
  );
}