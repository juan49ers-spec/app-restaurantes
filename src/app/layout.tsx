
import { createClient } from "@/lib/supabaseServer"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./driver-theme.css";
import "./performance.css";
import { Toaster } from "@/components/ui/sonner"
import { AppLayout } from "@/components/layout/AppLayout"
import { MotionProvider } from "@/components/providers/MotionProvider"

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
  preload: true
});

export const metadata: Metadata = {
  title: "ControlHub",
  description: "Gastronomic Intelligence Platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950/50 selection:bg-primary/30 selection:text-primary-foreground font-sans`}>
        <MotionProvider>
          <AppLayout user={user ?? undefined}>
            {children}
          </AppLayout>
        </MotionProvider>
        <Toaster />
      </body>
    </html>
  );
}
