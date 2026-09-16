import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-ff-sans",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

export default function FieldFirstLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={inter.variable} style={{ fontFamily: "var(--font-ff-sans)" }}>
      {children}
    </div>
  );
}
