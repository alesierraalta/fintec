'use client';

import { useState } from 'react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/main-layout';
import { TransactionType } from '@/types/domain';
import { logger } from '@/lib/utils/logger';

export default function DebugBalancePage() {
  const repository = useRepository();
  const { user } = useAuth();
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);

  const addLog = (message: string) => {
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const debugBalanceIssue = async () => {
    setIsDebugging(true);
    setDebugLog([]);
    
    try {
      addLog('🔍 Iniciando diagnóstico de balance...');
      
      if (!user) {
        addLog('❌ Usuario no autenticado');
        return;
      }
      
      addLog(`✅ Usuario autenticado: ${user.email}`);
      
      // 1. Verificar repositorios
      addLog('1. Verificando configuración de repositorios...');
      addLog(`✅ Repository disponible: ${repository.constructor.name}`);
      
      // 2. Verificar cuentas
      addLog('2. Obteniendo cuentas...');
      const accounts = await repository.accounts.findByUserId(user.id);
      addLog(`✅ Encontradas ${accounts.length} cuentas`);
      
      if (accounts.length === 0) {
        addLog('❌ No hay cuentas disponibles para probar');
        return;
      }
      
      const testAccount = accounts[0];
      addLog(`📊 Cuenta de prueba: ${testAccount.name} (ID: ${testAccount.id})`);
      addLog(`💰 Balance actual: ${testAccount.balance / 100} ${testAccount.currencyCode}`);
      
      // 3. Probar ajuste de balance directo
      addLog('3. Probando ajuste directo de balance...');
      const originalBalance = testAccount.balance;
      const testAdjustment = 1000; // $10.00
      
      try {
        const adjustedAccount = await repository.accounts.adjustBalance(testAccount.id, testAdjustment);
        addLog(`✅ Balance ajustado: ${adjustedAccount.balance / 100} ${adjustedAccount.currencyCode}`);
        
        // Verificar que el balance cambió
        if (adjustedAccount.balance !== originalBalance) {
          addLog('✅ El ajuste de balance funciona correctamente');
          
          // Revertir el cambio
          await repository.accounts.adjustBalance(testAccount.id, -testAdjustment);
          addLog('✅ Ajuste revertido');
        } else {
          addLog('❌ El balance no cambió después del ajuste');
        }
      } catch (error) {
        addLog(`❌ Error en ajuste de balance: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 4. Verificar categorías
      addLog('4. Obteniendo categorías...');
      const categories = await repository.categories.findAll();
      addLog(`✅ Encontradas ${categories.length} categorías`);
      
      if (categories.length === 0) {
        addLog('❌ No hay categorías disponibles para crear transacción');
        return;
      }
      
      const testCategory = categories.find(c => c.kind === 'INCOME') || categories[0];
      addLog(`📂 Categoría de prueba: ${testCategory.name} (${testCategory.kind})`);
      
      // 5. Probar creación de transacción
      addLog('5. Probando creación de transacción...');
      const balanceBeforeTransaction = (await repository.accounts.findById(testAccount.id))?.balance || 0;
      addLog(`💰 Balance antes de transacción: ${balanceBeforeTransaction / 100}`);
      
      const testTransactionData = {
        type: TransactionType.INCOME,
        accountId: testAccount.id,
        categoryId: testCategory.id,
        currencyCode: testAccount.currencyCode,
        amountMinor: 2500, // $25.00
        date: new Date().toISOString().split('T')[0],
        description: 'Transacción de prueba para debugging'
      };
      
      try {
        const createdTransaction = await repository.transactions.create(testTransactionData);
        addLog(`✅ Transacción creada: ${createdTransaction.id}`);
        addLog(`💵 Monto: ${createdTransaction.amountMinor / 100} (${createdTransaction.type})`);
        
        // Verificar balance después
        const balanceAfterTransaction = (await repository.accounts.findById(testAccount.id))?.balance || 0;
        addLog(`💰 Balance después de transacción: ${balanceAfterTransaction / 100}`);
        
        const expectedBalance = balanceBeforeTransaction + testTransactionData.amountMinor;
        if (balanceAfterTransaction === expectedBalance) {
          addLog('✅ ¡Balance actualizado correctamente!');
        } else {
          addLog(`❌ Balance incorrecto. Esperado: ${expectedBalance / 100}, Actual: ${balanceAfterTransaction / 100}`);
        }
        
        // Limpiar - eliminar transacción de prueba
        await repository.transactions.delete(createdTransaction.id);
        addLog('🧹 Transacción de prueba eliminada');
        
        // Verificar balance final
        const finalBalance = (await repository.accounts.findById(testAccount.id))?.balance || 0;
        addLog(`💰 Balance final: ${finalBalance / 100}`);
        
      } catch (error) {
        addLog(`❌ Error creando transacción: ${error instanceof Error ? error.message : String(error)}`);
        logger.error('Error completo:', error);
      }
      
      addLog('🏁 Diagnóstico completado');
      
    } catch (error) {
      addLog(`❌ Error en diagnóstico: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('Error completo:', error);
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Debug Balance Issue</h1>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <button
            onClick={debugBalanceIssue}
            disabled={isDebugging}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white rounded-lg font-medium"
          >
            {isDebugging ? 'Diagnosticando...' : 'Ejecutar Diagnóstico'}
          </button>
        </div>
        
        <div className="bg-black/50 border border-white/10 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Log de Diagnóstico:</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {debugLog.map((log, index) => (
              <div 
                key={index} 
                className={`text-sm font-mono ${
                  log.includes('✅') ? 'text-green-400' : 
                  log.includes('❌') ? 'text-red-400' :
                  log.includes('💰') ? 'text-yellow-400' :
                  log.includes('🔍') ? 'text-blue-400' :
                  'text-gray-300'
                }`}
              >
                {log}
              </div>
            ))}
            {debugLog.length === 0 && !isDebugging && (
              <div className="text-gray-400 text-sm">
                Haz clic en &ldquo;Ejecutar Diagnóstico&rdquo; para comenzar...
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}



