'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Heart, ExternalLink } from 'lucide-react';

interface FooterProps {
  sidebarCollapsed?: boolean;
}

export function Footer({ sidebarCollapsed = false }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: 'الدعم الفني', href: '/support' },
    { label: 'الشروط والأحكام', href: '/terms' },
    { label: 'سياسة الخصوصية', href: '/privacy' },
  ];

  return (
    <footer
      className={cn(
        'border-t border-gray-100 bg-white py-4 px-6',
        'transition-all duration-300',
        sidebarCollapsed ? 'mr-20' : 'mr-64'
      )}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Copyright */}
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>© {currentYear} منصة مياس للمحاسبة.</span>
          <span>جميع الحقوق محفوظة.</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Version */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>الإصدار 1.0.0</span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1">
            صُنع بـ
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            في السعودية
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
