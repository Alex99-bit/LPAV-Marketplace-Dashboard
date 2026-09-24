import { Outlet } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsentBanner from "@/components/legal/CookieConsentBanner";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
      >
        Saltar al contenido principal
      </a>
      <header>
        <Navbar />
      </header>
      <main id="main-content" className="flex-1 pt-20">
        <Outlet />
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  );
}
