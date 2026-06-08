import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/AppToast";
import { WishlistProvider } from "@/components/WishlistProvider";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Shahsi",
  description: "Premium fashion commerce platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <WishlistProvider>
            {children}
            <SiteFooter />
          </WishlistProvider>
        </ToastProvider>
      </body>
    </html>
  );
}