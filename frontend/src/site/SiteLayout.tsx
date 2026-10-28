import { useContext, useEffect, useState } from "react";
import { Link, Outlet } from "react-router";

import { initialLang, Lang, LangContext, useT } from "./i18n";
import { isAndroid } from "./install";

export function GetApp({ from, className = "" }: { from: string; className?: string }) {
  const t = useT();
  return (
    <Link
      to={`/install?src=${from}`}
      className={`inline-flex items-center justify-center min-h-12 px-6 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-base font-extrabold ${className}`}
    >
      {t("getApp")}
    </Link>
  );
}

function Shell() {
  const t = useT();
  const { lang, setLang } = useContext(LangContext);
  const android = isAndroid();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <div className={`min-h-screen bg-brand-page text-brand-ink ${android ? "pb-20" : ""}`}>
      <header className="sticky top-0 z-10 bg-white border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/welcome" className="text-lg font-black text-brand-navy">
            {t("brand")}
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm font-semibold text-brand-muted">
            <Link to="/welcome#services">{t("navServices")}</Link>
            <Link to="/partner">{t("navPartner")}</Link>
            <Link to="/support">{t("navSupport")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="min-h-10 px-3 rounded-xl border border-brand-border text-sm font-bold text-brand-navy"
            >
              {t("langToggle")}
            </button>
            <GetApp from="header" className="hidden sm:inline-flex !min-h-10 !px-4 !text-sm" />
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-brand-border bg-white mt-16">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-brand-muted">
          <div>
            <div className="font-black text-brand-navy">{t("brand")}</div>
            <div>{t("footerTag")}</div>
          </div>
          <div className="flex gap-5 font-semibold">
            <Link to="/partner">{t("navPartner")}</Link>
            <Link to="/support">{t("navSupport")}</Link>
          </div>
        </div>
      </footer>
      {android && (
        <div className="fixed bottom-0 inset-x-0 z-10 bg-white border-t border-brand-border p-3">
          <GetApp from="bar" className="w-full" />
        </div>
      )}
    </div>
  );
}

export default function SiteLayout() {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem("ghartak_lang", next);
    } catch {
      // storage blocked: the choice just won't persist
    }
  };
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <Shell />
    </LangContext.Provider>
  );
}
