import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const serif = Source_Serif_4({
  variable: "--font-ac-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-ac-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ac-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function ArcticCommandLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${serif.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{ fontFamily: "var(--font-ac-sans)" }}
    >
      {children}
    </div>
  );
}
