import type { ReactNode } from 'react';
import Header from './Header';
import BottomTabBar from './BottomTabBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-3 sm:py-6 mb-16 md:mb-0">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
