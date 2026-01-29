import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { getServerUser } from '@/lib/server-auth';

export const metadata: Metadata = {
  title: 'Procesos Fontan - Plataforma Interna',
  description: 'Sistema de gestión de solicitudes internas del Colegio Fontan',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  return (
    <html lang="es">
      <body>
        <Header user={user} />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}

