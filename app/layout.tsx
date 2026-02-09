import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toast';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SST - Sistema de Gestión de Seguridad y Salud en el Trabajo',
  description: 'Sistema de gestión integral para seguridad y salud ocupacional',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
