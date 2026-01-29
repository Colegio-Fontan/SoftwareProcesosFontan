'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu cuenta...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de confirmación no encontrado.');
      return;
    }

    const confirmEmail = async () => {
      try {
        const res = await fetch(`/api/auth/confirm?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || 'Error al confirmar el correo.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Error de conexión. Intenta nuevamente.');
      }
    };

    confirmEmail();
  }, [token]);

  return (
    <Card className="w-full max-w-md text-center p-8">
      <div className="mb-6">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        )}
        {status === 'success' && (
          <div className="text-green-500 text-5xl mb-4">✓</div>
        )}
        {status === 'error' && (
          <div className="text-red-500 text-5xl mb-4">✕</div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        {status === 'loading' ? 'Confirmando...' : status === 'success' ? '¡Confirmado!' : 'Error'}
      </h1>

      <p className="text-gray-600 mb-8">
        {message}
      </p>

      {status !== 'loading' && (
        <Link href="/login">
          <Button className="w-full">
            Ir al Inicio de Sesión
          </Button>
        </Link>
      )}
    </Card>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 px-4">
      <Suspense fallback={
        <Card className="w-full max-w-md text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando...</p>
        </Card>
      }>
        <ConfirmContent />
      </Suspense>
    </div>
  );
}
