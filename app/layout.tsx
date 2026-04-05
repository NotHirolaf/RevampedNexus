import type { Metadata } from "next";
import "@fontsource-variable/inter";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { FirebaseProvider } from "@/components/firebase-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus",
  description: "Your university life, organized.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-full flex flex-col antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster />
          <FirebaseProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
