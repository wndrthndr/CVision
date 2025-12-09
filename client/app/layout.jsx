import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

export const metadata = {
  title: "Resonance — AI Resume Analyzer",
  description: "Art-directed AI resume analysis with Gemini AI — private, elegant, instant.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} scroll-smooth`}
    >
      <body className="relative bg-background text-white overflow-x-hidden antialiased min-h-screen">

        {/* -------------------------------------------------- */}
        {/*  Layer 1 — Cinematic Backdrop Gradient              */}
        {/* -------------------------------------------------- */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_20%,#1a1a1d,transparent_65%)] opacity-80"></div>

        {/* -------------------------------------------------- */}
        {/*  Layer 2 — Editorial Gold Fog (Subtle Glow)         */}
        {/* -------------------------------------------------- */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_70%,rgba(255,208,134,0.12),transparent_70%)] blur-3xl opacity-70"></div>

        {/* -------------------------------------------------- */}
        {/*  Layer 3 — Soft Film Grain Overlay                  */}
        {/* -------------------------------------------------- */}
        <div className="pointer-events-none fixed inset-0 noise-texture opacity-[0.05] mix-blend-soft-light"></div>

        {/* -------------------------------------------------- */}
        {/*  Layer 4 — Motion Orbs (Ochi-style ambient depth)   */}
        {/* -------------------------------------------------- */}
        <div className="orbital" />
        <div className="orbital-2" />

        {/* -------------------------------------------------- */}
        {/*  MAIN CONTENT FRAME                                 */}
        {/*  Wide editorial spacing — NOT dashboard UI          */}
        {/* -------------------------------------------------- */}
        <main className="relative z-20 pt-28 pb-24 md:pt-32 md:pb-32 px-6 md:px-12 lg:px-20 max-w-screen-2xl mx-auto animate-fade-in"
              style={{ animationDuration: "1.25s" }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
