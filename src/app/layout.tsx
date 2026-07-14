import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { PlayerProvider } from "@/features/Player/player-context";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spotlab",
  description: "Spotlab — une alternative libre et gratuite à Spotify.",
};

export const viewport: Viewport = {
  themeColor: "#060608",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Passed to the player so a jam can attribute queued tracks and identify the
  // host. Null on the public (login/register) pages, where the provider still
  // mounts but no user is signed in.
  const user = await getCurrentUser();
  const currentUser = user
    ? { id: user.id, name: user.name?.trim() ? user.name : user.email }
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <PlayerProvider currentUser={currentUser}>{children}</PlayerProvider>
      </body>
    </html>
  );
}
