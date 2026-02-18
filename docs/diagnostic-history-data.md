# Script de Diagnóstico y Recuperación del Historial

Este documento contiene scripts para diagnosticar y recuperar datos históricos después del fix del bug de fechas.

## Diagnóstico: Ver Todos los Datos en IndexedDB

Ejecuta esto en la consola del navegador para ver TODOS los registros:

\`\`\`javascript
(async function diagnosticAll() {
const { bcvHistoryService } = await import('/lib/services/bcv-history-service');
const { binanceHistoryService } = await import('/lib/services/binance-history-service');

console.log('%c=== DIAGNÓSTICO COMPLETO ===', 'font-weight: bold; font-size: 16px; color: #3b82f6');

// Ver TODOS los registros BCV (sin límite de días)
const db = await new Promise((resolve) => {
const request = indexedDB.open('BCVHistoryDB');
request.onsuccess = () => resolve(request.result);
});

const transaction = db.transaction(['bcvHistory'], 'readonly');
const store = transaction.objectStore('bcvHistory');
const allRecords = await new Promise((resolve) => {
const request = store.getAll();
request.onsuccess = () => resolve(request.result);
});

console.log('%cTotal de registros BCV en IndexedDB:', 'font-weight: bold', allRecords.length);
console.table(allRecords.map(r => ({
ID: r.id,
Fecha: r.date,
USD: r.usd,
EUR: r.eur,
Timestamp: new Date(r.timestamp).toLocaleString('es-VE'),
Fuente: r.source
})));

// Verificar duplicados
const dates = allRecords.map(r => r.date);
const uniqueDates = new Set(dates);
const hasDuplicates = dates.length !== uniqueDates.size;

if (hasDuplicates) {
console.log('%c⚠️ HAY FECHAS DUPLICADAS', 'font-weight: bold; color: #f59e0b; font-size: 14px');
const duplicates = dates.filter((date, index) => dates.indexOf(date) !== index);
console.log('Fechas duplicadas:', [...new Set(duplicates)]);
} else {
console.log('%c✅ No hay fechas duplicadas', 'font-weight: bold; color: #10b981');
}

// Verificar Binance también
const dbBinance = await new Promise((resolve) => {
const request = indexedDB.open('BinanceHistoryDB');
request.onsuccess = () => resolve(request.result);
});

const txBinance = dbBinance.transaction(['binanceRates'], 'readonly');
const storeBinance = txBinance.objectStore('binanceRates');
const allBinanceRecords = await new Promise((resolve) => {
const request = storeBinance.getAll();
request.onsuccess = () => resolve(request.result);
});

console.log('%cTotal de registros Binance en IndexedDB:', 'font-weight: bold', allBinanceRecords.length);
console.table(allBinanceRecords.map(r => ({
ID: r.id,
Fecha: r.date,
USD: r.usd,
Timestamp: new Date(r.timestamp).toLocaleString('es-VE')
})));
})();
\`\`\`

## Verificar Datos en Supabase

Si tienes Supabase configurado, ejecuta esto para ver los datos en la nube:

\`\`\`javascript
(async function checkSupabase() {
const { createClient } = await import('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
console.log('❌ Supabase no configurado');
return;
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ver datos BCV en Supabase
const { data: bcvData, error: bcvError } = await supabase
.from('bcv_rate_history')
.select('\*')
.order('date', { ascending: false });

if (bcvError) {
console.error('Error al obtener datos BCV de Supabase:', bcvError);
} else {
console.log('%cDatos BCV en Supabase:', 'font-weight: bold; color: #3b82f6');
console.log('Total de registros:', bcvData.length);
console.table(bcvData.map(r => ({
Fecha: r.date,
USD: r.usd,
EUR: r.eur,
Fuente: r.source,
Creado: new Date(r.created_at).toLocaleString('es-VE')
})));
}

// Ver datos Binance en Supabase
const { data: binanceData, error: binanceError } = await supabase
.from('binance_rate_history')
.select('\*')
.order('date', { ascending: false });

if (binanceError) {
console.error('Error al obtener datos Binance de Supabase:', binanceError);
} else {
console.log('%cDatos Binance en Supabase:', 'font-weight: bold; color: #f59e0b');
console.log('Total de registros:', binanceData.length);
console.table(binanceData.map(r => ({
Fecha: r.date,
USD: r.usd,
Creado: new Date(r.created_at).toLocaleString('es-VE')
})));
}
})();
\`\`\`

## Limpiar Datos Duplicados

Si encuentras fechas duplicadas, ejecuta esto para mantener solo el registro más reciente de cada fecha:

\`\`\`javascript
(async function cleanDuplicates() {
console.log('%c=== LIMPIANDO DUPLICADOS ===', 'font-weight: bold; font-size: 16px; color: #ef4444');

const db = await new Promise((resolve) => {
const request = indexedDB.open('BCVHistoryDB');
request.onsuccess = () => resolve(request.result);
});

const transaction = db.transaction(['bcvHistory'], 'readwrite');
const store = transaction.objectStore('bcvHistory');

// Obtener todos los registros
const allRecords = await new Promise((resolve) => {
const request = store.getAll();
request.onsuccess = () => resolve(request.result);
});

// Agrupar por fecha
const byDate = {};
allRecords.forEach(record => {
if (!byDate[record.date]) {
byDate[record.date] = [];
}
byDate[record.date].push(record);
});

// Para cada fecha con duplicados, mantener solo el más reciente
let deletedCount = 0;
for (const [date, records] of Object.entries(byDate)) {
if (records.length > 1) {
console.log(\`Fecha \${date} tiene \${records.length} registros duplicados\`);

      // Ordenar por timestamp (más reciente primero)
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Eliminar todos excepto el primero (más reciente)
      for (let i = 1; i < records.length; i++) {
        await new Promise((resolve) => {
          const deleteRequest = store.delete(records[i].id);
          deleteRequest.onsuccess = resolve;
        });
        deletedCount++;
        console.log(\`  Eliminado registro ID \${records[i].id}\`);
      }
    }

}

console.log(\`%c✅ Limpieza completada. Eliminados \${deletedCount} registros duplicados\`, 'font-weight: bold; color: #10b981');

// Hacer lo mismo para Binance
const dbBinance = await new Promise((resolve) => {
const request = indexedDB.open('BinanceHistoryDB');
request.onsuccess = () => resolve(request.result);
});

const txBinance = dbBinance.transaction(['binanceRates'], 'readwrite');
const storeBinance = txBinance.objectStore('binanceRates');

const allBinanceRecords = await new Promise((resolve) => {
const request = storeBinance.getAll();
request.onsuccess = () => resolve(request.result);
});

const byDateBinance = {};
allBinanceRecords.forEach(record => {
if (!byDateBinance[record.date]) {
byDateBinance[record.date] = [];
}
byDateBinance[record.date].push(record);
});

let deletedBinanceCount = 0;
for (const [date, records] of Object.entries(byDateBinance)) {
if (records.length > 1) {
records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
for (let i = 1; i < records.length; i++) {
await new Promise((resolve) => {
const deleteRequest = storeBinance.delete(records[i].id);
deleteRequest.onsuccess = resolve;
});
deletedBinanceCount++;
}
}
}

console.log(\`%c✅ Binance: Eliminados \${deletedBinanceCount} registros duplicados\`, 'font-weight: bold; color: #10b981');
})();
\`\`\`

## Sincronizar desde Supabase

Si tienes datos en Supabase, puedes forzar una sincronización completa:

\`\`\`javascript
(async function syncFromSupabase() {
const { bcvHistoryService } = await import('/lib/services/bcv-history-service');
const { binanceHistoryService } = await import('/lib/services/binance-history-service');

console.log('Sincronizando desde Supabase...');

await bcvHistoryService.loadFromSupabase(90); // Últimos 90 días
await binanceHistoryService.loadFromSupabase(90);

console.log('✅ Sincronización completada');

// Verificar resultados
const bcvRates = await bcvHistoryService.getHistoricalRates(90);
const binanceRates = await binanceHistoryService.getHistoricalRates(90);

console.log(\`BCV: \${bcvRates.length} registros\`);
console.log(\`Binance: \${binanceRates.length} registros\`);
})();
\`\`\`

## Pasos Recomendados

1. **Ejecuta el diagnóstico completo** para ver qué datos tienes
2. **Si hay duplicados**, ejecuta el script de limpieza
3. **Si tienes Supabase**, verifica los datos en la nube
4. **Si Supabase tiene más datos**, sincroniza desde allí
5. **Recarga la página** y verifica el historial nuevamente
