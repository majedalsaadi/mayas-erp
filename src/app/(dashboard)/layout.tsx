'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div
        className={cn(
          'transition-all duration-300 min-h-screen flex flex-col',
          sidebarCollapsed ? 'mr-20' : 'mr-64'
        )}
      >
        {/* Header */}
        <Header sidebarCollapsed={sidebarCollapsed} />

        {/* Page Content */}
        <main className="flex-1 pt-16 pb-6 px-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer sidebarCollapsed={sidebarCollapsed} />
      </div>
    </div>
  );
}
