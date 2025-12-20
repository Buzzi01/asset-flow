import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Mudamos para Inter (Padrão e Seguro)
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AssetFlow Pro",
  description: "Gestão Inteligente de Ativos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: Remove o erro vermelho de extensão do navegador
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-[#0b0f19] text-slate-200`}>
        {children}
      </body>
    </html>
  );
}