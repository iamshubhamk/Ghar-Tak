import { useEffect } from "react";
import { Link } from "react-router";

import { Key, useT } from "./i18n";
import { whatsappUrl } from "./install";

// Placeholder legal text. It describes what the app does today; everything in [brackets] is a
// decision or fact the owner must fill in, and a lawyer must review the whole page before launch.
type Section = [heading: string, ...paragraphs: string[]];

function Doc({ title, titleKey, sections, children }: { title: string; titleKey: Key; sections: Section[]; children?: React.ReactNode }) {
  const t = useT();
  useEffect(() => {
    document.title = `${title} | GharTak`;
  }, [title]);
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-brand-navy">{t(titleKey)}</h1>
      <p role="note" className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-900">
        {t("legalDraft")} {t("legalEnglishOnly")}
      </p>
      {children}
      {sections.map(([heading, ...paragraphs]) => (
        <section key={heading} className="mt-8">
          <h2 className="text-xl font-extrabold text-brand-navy">{heading}</h2>
          {paragraphs.map((p) => (
            <p key={p} className="mt-2 text-brand-ink leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}

const privacy: Section[] = [
  ["Who we are", "GharTak connects customers in Patna, Bihar with verified local service providers. This policy explains what we collect and why. Operator: [LEGAL NAME AND REGISTERED ADDRESS OF THE BUSINESS]."],
  [
    "What we collect",
    "Everyone: name, phone number, email address and password.",
    "Customers: service addresses (house number, building, landmark, locality, pincode), the map location you choose for a booking, booking details and notes, and ratings you give.",
    "Providers: profile photo, bio, years of experience, trade categories and service areas, Aadhaar card document, bank account holder name, account number, IFSC, UPI ID and a passbook or cheque copy, and proof documents for extra skills.",
    "Device: a push-notification token so we can send you booking updates.",
  ],
  [
    "How we use it",
    "To create your account, take and assign bookings, verify providers, send booking notifications, give support, and keep the service safe and fair.",
  ],
  [
    "Who can see it",
    "The provider assigned to your booking sees your name, address and booking details. Our admin team sees account and booking data to run the service. Providers' Aadhaar and bank documents are viewable only by our admin team and by the provider who uploaded them.",
    "We do not sell your personal data. We use [LIST HOSTING, STORAGE AND NOTIFICATION PROVIDERS, E.G. CLOUD HOST, FILE STORAGE, PUSH SERVICE] to run the service; they process data only for us.",
  ],
  ["How long we keep it", "[RETENTION PERIODS FOR ACCOUNTS, BOOKINGS AND DOCUMENTS]. When you delete your account we remove your profile and documents and anonymise your booking history. See the delete-account page."],
  ["Your choices", "You can correct your details in the app. You can ask us to delete your account and data at any time using the delete-account page."],
  ["Security", "Documents are stored privately and are not publicly reachable. No system is perfectly secure, so please keep your password and booking OTP to yourself."],
  ["Children", "GharTak is not meant for people under 18. [CONFIRM MINIMUM AGE]."],
  ["Changes", "We will post changes on this page. [DATE LAST UPDATED]."],
  ["Contact", "Questions or requests: [SUPPORT EMAIL AND PHONE]. You can also use the support page."],
];

const terms: Section[] = [
  ["Using GharTak", "By using the app or website you agree to these terms. GharTak is a marketplace: we connect customers with independent service providers. Operator: [LEGAL NAME AND REGISTERED ADDRESS OF THE BUSINESS]."],
  ["Accounts", "Give accurate details and keep your password private. You are responsible for activity on your account. You must be at least [MINIMUM AGE] years old."],
  ["Bookings", "A booking is a request. Our team assigns a verified provider, and the status shown in the app is the status that counts. We cannot promise a provider will be free at every time. [HOURS AND EXPECTED CONFIRMATION TIME]."],
  ["Providers", "Providers are independent and must pass our verification before taking jobs. We may reject, pause or remove a provider who gives false information or behaves unsafely."],
  ["Prices and payment", "Prices shown in the app are a guide; the final amount depends on the work done. [PAYMENT METHODS, WHEN PAYMENT IS DUE, REFUNDS]."],
  ["Cancellations", "[CANCELLATION RULES AND ANY FEES]."],
  ["Behaviour", "Be respectful. Do not misuse the service, share your booking OTP with anyone other than the provider at your door, or post false reviews."],
  ["Responsibility", "[LIABILITY LIMITS AND DISPUTE HANDLING: TO BE WRITTEN BY A LAWYER]."],
  ["Law", "These terms are governed by the laws of India. [COURTS, E.G. PATNA]."],
  ["Changes and contact", "We may update these terms and will post the new version here. [DATE LAST UPDATED]. Contact: [SUPPORT EMAIL AND PHONE]."],
];

const deletion: Section[] = [
  ["What happens when you delete", "We remove your profile, saved addresses and uploaded documents (including a provider's Aadhaar and bank documents), and sign you out everywhere. Past bookings are kept without your name or contact details so provider and business records stay correct. [CONFIRM WITH BACKEND WHEN THE DELETION FEATURE SHIPS]."],
  ["How long it takes", "[DAYS WE TAKE TO COMPLETE A REQUEST]."],
  ["Before you ask", "Deletion cannot be undone. Finish or cancel any open booking first. Providers who have money owed to them should contact support before deleting."],
];

export const Privacy = () => <Doc title="Privacy policy" titleKey="navPrivacy" sections={privacy} />;
export const Terms = () => <Doc title="Terms of use" titleKey="navTerms" sections={terms} />;

export function DeleteAccount() {
  const t = useT();
  const wa = whatsappUrl("Hi GharTak, I want to delete my account");
  return (
    <Doc title="Delete your account" titleKey="navDelete" sections={deletion}>
      <section className="mt-8">
        <h2 className="text-xl font-extrabold text-brand-navy">How to request deletion</h2>
        <ol className="mt-2 list-decimal pl-5 space-y-2 text-brand-ink leading-relaxed">
          <li>Contact us from the phone number or email on your account. [SUPPORT EMAIL AND PHONE]. Say you want to delete your GharTak account.</li>
          <li>We confirm it is you, then delete the account and tell you when it is done.</li>
        </ol>
        {wa ? (
          <a href={wa} className="mt-4 inline-flex items-center min-h-12 px-6 rounded-2xl bg-brand-orange text-white font-extrabold">
            {t("supportWhatsApp")}
          </a>
        ) : (
          <Link to="/support" className="mt-4 inline-block underline font-semibold text-brand-navy">
            {t("navSupport")}
          </Link>
        )}
      </section>
    </Doc>
  );
}
