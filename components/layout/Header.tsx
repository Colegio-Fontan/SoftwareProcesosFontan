'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { User } from '@/types';

interface HeaderProps {
  user: User | null;
}

const roleLabels: Record<string, string> = {
  empleado: 'Empleado',
  sistemas: 'Sistemas',
  gestion_humana: 'Gestión Humana',
  cartera: 'Cartera',
  gerencia: 'Gerencia',
  rectoria: 'Rectoría',
  servicios_generales: 'Servicios Generales',
  admin: 'Administrador',
};

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href={user ? "/home" : "/"} className="text-2xl font-bold">
            Procesos Fontan
          </Link>

          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <Link href="/home" className="hover:text-secondary transition-colors font-medium">
                  Inicio
                </Link>
                <Link href="/requests/my" className="hover:text-secondary transition-colors font-medium">
                  Mis Solicitudes
                </Link>

                {user.role !== 'empleado' && (
                  <Link href="/requests/pending" className="hover:text-secondary transition-colors font-medium">
                    🔔 Pendientes
                  </Link>
                )}

                {['gerencia', 'rectoria', 'admin'].includes(user.role) && (
                  <Link href="/admin/requests" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-2">
                    📊 Panel Admin
                  </Link>
                )}

                <div className="flex items-center gap-3 border-l border-white/20 pl-6">
                  <div className="text-right">
                    <p className="text-sm font-bold leading-tight">{user.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/70 leading-tight">
                      {roleLabels[user.role]}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500/20 hover:bg-red-500/40 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border border-red-500/30"
                  >
                    SALIR
                  </button>
                </div>
              </>
            ) : (
              <Link href="/">
                <Button variant="secondary" size="sm">
                  Iniciar Sesión
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
