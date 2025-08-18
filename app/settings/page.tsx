import { MainLayout } from '@/components/layout/main-layout';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
          <p className="text-gray-400">Personaliza tu experiencia y configuraciones</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Próximamente</h2>
          <p className="text-gray-400">Esta página estará disponible pronto</p>
        </div>
      </div>
    </MainLayout>
  );
}
