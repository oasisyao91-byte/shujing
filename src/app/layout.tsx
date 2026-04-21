import type { Metadata } from "next";
import { Inter, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast/toaster"; // Assuming we will create a Toaster component

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSerif = Noto_Serif_SC({ 
  weight: ["400", "500", "700"], 
  subsets: ["latin"], 
  variable: "--font-noto-serif" 
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | 书境 BookMind",
    default: "书境 BookMind - 懂你的 AI 阅读伴侣",
  },
  description: "不推送算法爱看的内容，只推荐你此刻真正需要的书。基于大语言模型与阅读性格测试的智能书籍推荐平台。",
  keywords: ["书境", "BookMind", "AI 选书", "阅读性格", "书籍推荐", "豆瓣", "书单", "阅读笔记"],
  openGraph: {
    title: "书境 BookMind",
    description: "基于阅读性格的 AI 选书助手",
    url: siteUrl,
    siteName: "书境 BookMind",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "书境 BookMind",
    description: "基于阅读性格的 AI 选书助手",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${notoSerif.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
