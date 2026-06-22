import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '万源图谱 —— 看见被行业分类切断的连接',
  description: '一个产业关系图谱网站。从行业出发查看上下游关系，从材料出发发现跨行业延伸应用。',
  keywords: ['产业链', '图谱', '材料', '跨行业', '产业关系', '光伏', '储能', '供应链'],
  authors: [{ name: '万源图谱' }],
  openGraph: {
    title: '万源图谱 —— 看见被行业分类切断的连接',
    description: '一个产业关系图谱网站。从行业出发查看上下游关系，从材料出发发现跨行业延伸应用。',
    type: 'website',
    locale: 'zh_CN',
    siteName: '万源图谱',
  },
  twitter: {
    card: 'summary_large_image',
    title: '万源图谱',
    description: '看见被行业分类切断的连接',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
