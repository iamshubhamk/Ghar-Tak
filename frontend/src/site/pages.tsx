import { useContext, useEffect } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";

import { defaultServices } from "../lib/defaultServices";
import { GetApp } from "./SiteLayout";
import { Key, LangContext, useT } from "./i18n";
import { isAndroid, isIos, playUrl, whatsappUrl } from "./install";

const HI_NAMES: Record<string, string> = {
  Electrician: "इलेक्ट्रीशियन",
  Plumber: "प्लंबर",
  Carpenter: "बढ़ई",
  Painter: "पेंटर",
  "AC Repair": "AC रिपेयर",
  "Appliance Repair": "अप्लायंस रिपेयर",
  "House Cleaning": "घर की सफाई",
  Driver: "ड्राइवर",
  Tutor: "ट्यूटर",
  "Event Staff": "इवेंट स्टाफ",
};

// "Other Service" has no page: it is a custom quote, not a service we can describe.
const services = defaultServices
  .filter((s) => s.name in HI_NAMES)
  .map((s) => ({ ...s, slug: s.name.toLowerCase().replace(/\s+/g, "-") }));

function useService() {
  const { lang } = useContext(LangContext);
  return (name: string, priceLabel: string) => {
    const amount = /INR (\d+)/.exec(priceLabel)?.[1];
    return {
      name: lang === "hi" ? HI_NAMES[name] : name,
      price: amount ? (lang === "hi" ? `₹${amount} से शुरू` : `Starts at ₹${amount}`) : "",
    };
  };
}

function useTitle(text: string) {
  useEffect(() => {
    document.title = `${text} | GharTak`;
  }, [text]);
}

const wrap = "max-w-5xl mx-auto px-4";
const h2 = "text-2xl font-black text-brand-navy";
const card = "bg-white rounded-2xl border border-brand-border p-5";

function Cards({ items }: { items: [Key, Key][] }) {
  const t = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-3 mt-6">
      {items.map(([title, body]) => (
        <div key={title} className={card}>
          <h3 className="font-extrabold text-brand-navy">{t(title)}</h3>
          <p className="mt-2 text-sm text-brand-muted">{t(body)}</p>
        </div>
      ))}
    </div>
  );
}

export function Landing() {
  const t = useT();
  const svc = useService();
  const { hash } = useLocation();
  useTitle(t("heroTitle"));
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <>
      <section className={`${wrap} pt-12 pb-10 sm:pt-20`}>
        <h1 className="text-3xl sm:text-5xl font-black text-brand-navy leading-tight max-w-3xl">{t("heroTitle")}</h1>
        <p className="mt-4 text-lg text-brand-muted max-w-2xl">{t("heroSub")}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <GetApp from="hero" className="w-full sm:w-auto" />
          <span className="text-sm text-brand-muted">{t("heroNote")}</span>
        </div>
      </section>

      <section className={`${wrap} py-10`}>
        <h2 className={h2}>{t("trustTitle")}</h2>
        <Cards items={[["trust1Title", "trust1Body"], ["trust2Title", "trust2Body"], ["trust3Title", "trust3Body"]]} />
      </section>

      <section id="services" className={`${wrap} py-10`}>
        <h2 className={h2}>{t("servicesTitle")}</h2>
        <p className="mt-1 text-brand-muted">{t("servicesSub")}</p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {services.map((s) => {
            const { name, price } = svc(s.name, s.priceLabel);
            return (
              <Link key={s.slug} to={`/services/${s.slug}`} className={`${card} !p-4 hover:border-brand-orange`}>
                <div className="font-extrabold text-brand-navy">{name}</div>
                <div className="text-sm text-brand-muted">{price}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={`${wrap} py-10`}>
        <h2 className={h2}>{t("stepsTitle")}</h2>
        <Cards items={[["step1Title", "step1Body"], ["step2Title", "step2Body"], ["step3Title", "step3Body"]]} />
      </section>

      <section className={`${wrap} py-10 text-center`}>
        <h2 className={h2}>{t("closeTitle")}</h2>
        <p className="mt-2 text-brand-muted">{t("closeNote")}</p>
        <GetApp from="footer-cta" className="mt-5 w-full sm:w-auto" />
        <div className="mt-4">
          <Link to="/partner" className="text-sm font-semibold text-brand-navy underline">
            {t("partnerCta")}
          </Link>
        </div>
      </section>
    </>
  );
}

export function ServicePage() {
  const t = useT();
  const svc = useService();
  const { slug } = useParams();
  const found = services.find((s) => s.slug === slug);
  const { name, price } = found ? svc(found.name, found.priceLabel) : { name: "", price: "" };
  useTitle(found ? t("serviceH1", { name }) : t("notFound"));

  if (!found) {
    return (
      <section className={`${wrap} py-16`}>
        <h1 className={h2}>{t("notFound")}</h1>
        <Link to="/welcome#services" className="mt-4 inline-block underline text-brand-navy font-semibold">
          {t("serviceBack")}
        </Link>
      </section>
    );
  }
  return (
    <section className={`${wrap} py-12`}>
      <h1 className="text-3xl sm:text-4xl font-black text-brand-navy">{t("serviceH1", { name })}</h1>
      <p className="mt-4 text-lg text-brand-muted max-w-2xl">{t("serviceBody", { name })}</p>
      {price && (
        <p className="mt-4 font-bold text-brand-navy">
          {t("servicePrice")}: {price}
        </p>
      )}
      <GetApp from={`service-${found.slug}`} className="mt-6 w-full sm:w-auto" />
      <div className="mt-6">
        <Link to="/welcome#services" className="text-sm font-semibold text-brand-navy underline">
          {t("serviceBack")}
        </Link>
      </div>
    </section>
  );
}

export function Partner() {
  const t = useT();
  useTitle(t("partnerTitle"));
  return (
    <section className={`${wrap} py-12`}>
      <h1 className="text-3xl sm:text-4xl font-black text-brand-navy">{t("partnerTitle")}</h1>
      <p className="mt-3 text-lg text-brand-muted max-w-2xl">{t("partnerSub")}</p>
      <Cards items={[["partner1", "partner1Body"], ["partner2", "partner2Body"], ["partner3", "partner3Body"]]} />
      <h2 className={`${h2} mt-10`}>{t("partnerStepsTitle")}</h2>
      <ol className="mt-4 space-y-2 list-decimal pl-5 text-brand-ink">
        {(["partnerStep1", "partnerStep2", "partnerStep3"] as Key[]).map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ol>
      <GetApp from="partner" className="mt-8 w-full sm:w-auto" />
    </section>
  );
}

export function Support() {
  const t = useT();
  useTitle(t("supportTitle"));
  const wa = whatsappUrl("Hi GharTak, I need help");
  return (
    <section className={`${wrap} py-12`}>
      <h1 className="text-3xl sm:text-4xl font-black text-brand-navy">{t("supportTitle")}</h1>
      <p className="mt-3 text-lg text-brand-muted">{t("supportSub")}</p>
      {wa ? (
        <a href={wa} className="mt-5 inline-flex items-center min-h-12 px-6 rounded-2xl bg-brand-orange text-white font-extrabold">
          {t("supportWhatsApp")}
        </a>
      ) : (
        <p className="mt-5 text-sm text-brand-muted">{t("supportNoContact")}</p>
      )}
      <h2 className={`${h2} mt-10`}>{t("faqTitle")}</h2>
      <div className="mt-4 space-y-3">
        {([["faq1Q", "faq1A"], ["faq2Q", "faq2A"], ["faq3Q", "faq3A"]] as [Key, Key][]).map(([q, a]) => (
          <div key={q} className={card}>
            <h3 className="font-extrabold text-brand-navy">{t(q)}</h3>
            <p className="mt-1 text-sm text-brand-muted">{t(a)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Link target for SMS, WhatsApp, posters and QR codes. Android goes straight to Play when a URL is set.
export function Install() {
  const t = useT();
  const [params] = useSearchParams();
  const src = params.get("src") ?? "website";
  const play = playUrl(src);
  const redirecting = isAndroid() && !!play;
  useTitle(t("installTitle"));

  useEffect(() => {
    if (redirecting) window.location.replace(play);
  }, [redirecting, play]);

  const wa = whatsappUrl("Hi GharTak, please notify me when the app is live");
  return (
    <section className={`${wrap} py-16 text-center`}>
      <h1 className="text-3xl font-black text-brand-navy">{t(play ? "installTitle" : "installSoonTitle")}</h1>
      {redirecting && <p className="mt-4 text-brand-muted">{t("installOpening")}</p>}
      {!redirecting && play && (
        <>
          <a href={play} className="mt-6 inline-flex items-center min-h-12 px-6 rounded-2xl bg-brand-orange text-white font-extrabold">
            {t("installPlay")}
          </a>
          <p className="mt-4 text-brand-muted">{t(isIos() ? "installIos" : "installDesktop")}</p>
        </>
      )}
      {!play && (
        <>
          <p className="mt-4 text-brand-muted">{t("installSoonBody")}</p>
          {wa ? (
            <a href={wa} className="mt-6 inline-flex items-center min-h-12 px-6 rounded-2xl bg-brand-orange text-white font-extrabold">
              {t("installWhatsApp")}
            </a>
          ) : (
            <p className="mt-6 text-sm text-brand-muted">{t("supportNoContact")}</p>
          )}
          {isIos() && <p className="mt-4 text-brand-muted">{t("installIos")}</p>}
        </>
      )}
    </section>
  );
}
