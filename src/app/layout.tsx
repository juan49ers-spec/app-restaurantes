
import { createClient } from "@/lib/supabaseServer"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./driver-theme.css";
import { Toaster } from "@/components/ui/sonner"
import { AppLayout } from "@/components/layout/AppLayout"

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950/50 selection:bg-primary/30 selection:text-primary-foreground`}>
        <AppLayout user={user ?? undefined}>
          {children}
        </AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
