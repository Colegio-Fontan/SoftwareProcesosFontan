'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (email: string) => {
    setFormData({ email, password: 'password123' });
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setIsLoading(false);
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err) {
      setError('Error de conexión.');
      setIsLoading(false);
    }
  };

  const testUsers = [
    { label: 'Tutor', email: 'tutor@colegiofontan.edu.co', icon: '👨‍🏫' },
    { label: 'Sistemas', email: 'sistemas@colegiofontan.edu.co', icon: '💻' },
    { label: 'Humana', email: 'humana@colegiofontan.edu.co', icon: '👥' },
    { label: 'Cartera', email: 'cartera@colegiofontan.edu.co', icon: '💰' },
    { label: 'Gerencia', email: 'gerencia@colegiofontan.edu.co', icon: '🏢' },
    { label: 'Rectoría', email: 'rectoria@colegiofontan.edu.co', icon: '🎓' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Procesos Fontan
          </h1>
          <p className="text-gray-600">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="tu@email.com"
          />

          <Input
            label="Contraseña"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            placeholder="••••••••"
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Iniciar Sesión
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>⚡</span> Acceso Rápido para Pruebas
          </p>
          <div className="grid grid-cols-2 gap-2">
            {testUsers.map((u) => (
              <button
                key={u.email}
                onClick={() => quickLogin(u.email)}
                disabled={isLoading}
                className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">{u.icon}</span>
                <span className="text-xs font-medium text-gray-700">{u.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 text-center">
            * Haz click en un rol para entrar instantáneamente con correo @colegiofontan.edu.co
          </p>
        </div>
      </Card>
    </div>
  );
}
