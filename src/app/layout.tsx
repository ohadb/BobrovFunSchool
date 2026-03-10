import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "BobrovFunSchool",
  description: "A fun learning platform for kids",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
