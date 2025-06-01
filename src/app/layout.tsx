import type { Metadata } from "next";
import { AppThemeProvider } from "@/components/themeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Car Game on Google Maps",
  description: "A strategy game with cars on Google Maps",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
