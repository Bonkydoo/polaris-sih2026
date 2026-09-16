import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

const grotesk = Space_Grotesk({
  variable: "--font-pd-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-pd-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export default function PolarOpsDarkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${grotesk.variable} ${jetbrains.variable} dark`}
      style={{ fontFamily: "var(--font-pd-mono)" }}
    >
      {children}
    </div>
  );
}
