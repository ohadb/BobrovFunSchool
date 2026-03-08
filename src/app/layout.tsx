import type { Metadata } from "next";
import "./globals.css";
import DebugUserPicker from "@/components/DebugUserPicker";

export const metadata: Metadata = {
  title: "BobrovFunSchool - Parent Dashboard",
  description: "A fun learning platform for kids",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>
        <DebugUserPicker />
        <div style={{ paddingTop: 36 }}>{children}</div>
      </body>
    </html>
  );
}
