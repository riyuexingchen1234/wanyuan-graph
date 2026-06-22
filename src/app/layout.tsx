import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "万源图谱",
  description: "看见被行业分类切断的连接",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="w-full h-full">
        {children}
      </body>
    </html>
  );
}