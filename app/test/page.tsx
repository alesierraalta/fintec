'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function TestPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-green-400">¡Navegación Funciona! ✅</h1>
        <p className="text-gray-300">Si puedes ver esta página, la navegación está funcionando correctamente.</p>
        <div className="space-y-4">
          <button
            onClick={() => {
              router.push('/transactions/add');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Ir a Nueva Transacción
          </button>
          <br />
          <button
            onClick={() => {
              router.push('/');
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
