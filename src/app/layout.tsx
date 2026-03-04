
import { createClient } from "@/lib/supabaseServer"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./driver-theme.css";
import "./performance.css";
import { Toaster } from "@/components/ui/sonner"
import { AppLayout } from "@/components/layout/AppLayout"
import { MotionProvider } from "@/components/providers/MotionProvider"
import { cookies } from "next/headers"
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner"
import { BroadcastBanner } from "@/components/common/BroadcastBanner"
import { getActiveBroadcasts } from "@/app/actions/broadcasts"

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
  const cookieStore = await cookies()
  const impersonatedRestaurantName = cookieStore.get('impersonated_restaurant_name')?.value

  // Get active addons and restaurant info for navigation filtering
  let activeAddons: string[] = []
  let restaurantId = ''
  let restaurantName = ''
  if (user) {
    const { getCurrentRestaurant } = await import('@/app/actions/user')
    const restaurant = await getCurrentRestaurant()
    activeAddons = restaurant?.active_addons || []
    restaurantId = restaurant?.id || ''
    restaurantName = restaurant?.name || ''
  }

  const broadcasts = await getActiveBroadcasts()

  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950/50 selection:bg-primary/30 selection:text-primary-foreground font-sans`}>
        <BroadcastBanner broadcasts={broadcasts} />
        <MotionProvider>
          <AppLayout user={user ?? undefined} activeAddons={activeAddons} restaurantId={restaurantId} restaurantName={restaurantName}>
            {children}
          </AppLayout>
        </MotionProvider>
        <Toaster />
        {impersonatedRestaurantName && (
          <ImpersonationBanner restaurantName={impersonatedRestaurantName} />
        )}
      </body>
    </html>
  );
}
