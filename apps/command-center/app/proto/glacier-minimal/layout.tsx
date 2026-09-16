import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-gm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function GlacierMinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={jakarta.variable} style={{ fontFamily: "var(--font-gm-sans)" }}>
      {children}
    </div>
  );
}
