/**
 * Mayas ERP - Next.js App
 * الملف الرئيسي للتطبيق
 */

import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'منصة مياس للمحاسبة',
  description: 'نظام ERP سحابي متكامل لقطاع قطع غيار السيارات',
  keywords: ['ERP', 'محاسبة', 'قطع غيار', 'سيارات', 'POS', 'ZATCA'],
  authors: [{ name: 'Mayas ERP Team' }],
  creator: 'Mayas ERP',
  publisher: 'Mayas ERP',
  robots: 'index, follow',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
