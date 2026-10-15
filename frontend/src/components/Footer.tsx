import Link from "next/link";
import { Logo } from "./Logo";

const LEGAL_LINKS = [
  { href: "/legal/risk-disclosure", label: "Risk Disclosure" },
  { href: "/legal/terms", label: "Terms & Conditions" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/aml", label: "AML Policy" },
  { href: "/legal/kyc", label: "KYC Policy" },
  { href: "/legal/execution", label: "Execution Policy" },
  { href: "/legal/client-agreement", label: "Client Agreement" },
  { href: "/legal/fees", label: "Fees & Charges" },
  { href: "/legal/complaints", label: "Complaints Procedure" },
];

export function Footer() {
  return (
    <footer className="border-t border-[rgb(var(--border))] vx-surface mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <Logo className="h-5 w-5" />
              Vertex Trading
            </div>
            <p className="vx-muted leading-relaxed">
              Trade Forex, Crypto and other supported financial instruments through a professional trading
              platform with real-time market data.
            </p>
          </div>
          <div>
            <div className="font-medium mb-3">Platform</div>
            <ul className="space-y-2 vx-muted">
              <li><Link href="/markets" className="hover:text-[rgb(var(--text))]">Markets</Link></li>
              <li><Link href="/trading" className="hover:text-[rgb(var(--text))]">Trading</Link></li>
              <li><Link href="/account-types" className="hover:text-[rgb(var(--text))]">Account Types</Link></li>
              <li><Link href="/education" className="hover:text-[rgb(var(--text))]">Education</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-3">Legal</div>
            <ul className="space-y-2 vx-muted max-h-40 overflow-y-auto pr-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-[rgb(var(--text))]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-3">Contact</div>
            <ul className="space-y-2 vx-muted">
              <li><Link href="/contact" className="hover:text-[rgb(var(--text))]">Contact us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[rgb(var(--border))] text-xs vx-muted leading-relaxed space-y-2">
          <p>
            Trading leveraged financial products and cryptocurrencies involves significant risk and may not be
            suitable for all investors. You may lose some or all of your invested capital. Please consider your
            financial circumstances and risk tolerance before trading.
          </p>
          <p>
            Vertex Trading is a demonstration platform. It is not presented as, and does not operate as, a
            licensed broker. See our <Link href="/legal/risk-disclosure" className="underline">Risk Disclosure</Link> for details.
          </p>
          <p>© {new Date().getFullYear()} Vertex Trading. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
