import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TickerTape } from "@/components/markets/TickerTape";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <TickerTape />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
