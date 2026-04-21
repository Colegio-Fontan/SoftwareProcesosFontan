'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { User } from '@/types';
import Image from 'next/image';
import { Home, ClipboardList, Bell, LayoutDashboard, LogOut } from 'lucide-react';

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
      <div className="w-full px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href={user ? "/home" : "/"} className="flex items-center hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="Procesos Fontán Logo" 
              width={260} 
              height={60} 
              className="object-contain scale-[1.35] lg:scale-[1.45] origin-left ml-1"
              priority
            />
          </Link>

          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <Link href="/home" className="hover:text-secondary transition-colors font-medium flex items-center gap-2">
                  <Home className="w-4 h-4" /> Inicio
                </Link>
                <Link href="/requests/my" className="hover:text-secondary transition-colors font-medium flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Mis solicitudes
                </Link>

                <Link href="/requests/pending" className="hover:text-secondary transition-colors font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Pendientes
                </Link>

                {['gerencia', 'rectoria', 'admin'].includes(user.role) && (
                  <Link href="/admin/requests" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Panel admin
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
                    className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/40 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border border-red-500/30"
                  >
                    <LogOut className="w-4 h-4" /> SALIR
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
    </header>
  );
};
