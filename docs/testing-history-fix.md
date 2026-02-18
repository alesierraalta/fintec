# Instrucciones para Probar el Fix del Historial

## Problema Resuelto

El sistema de historial ahora puede guardar tasas para fechas específicas, no solo para "hoy".

## Cómo Probar en el Navegador

### Opción 1: Usar la Consola del Navegador

1. **Inicia la aplicación:**

   ```bash
   npm run dev
   ```

2. **Abre la aplicación en el navegador** (usualmente `http://localhost:3000`)

3. **Abre DevTools** (F12 o clic derecho → Inspeccionar)

4. **Ve a la pestaña Console**

5. **Copia y pega este código:**

```javascript
(async function testHistoryDates() {
  console.log('🧪 Testing History Date Parameter Fix\\n');

  const { bcvHistoryService } = await import('/lib/services/bcv-history-service');
  const { binanceHistoryService } = await import('/lib/services/binance-history-service');
  const { formatCaracasDayKey } = await import('/lib/utils/date-key');

  try {
    // Guardar tasas para hoy
    console.log('Guardando tasas para hoy...');
    await bcvHistoryService.saveRates(50.5, 55.2, 'BCV');
    await binanceHistoryService.saveRates(49.8);
    console.log('✅ Hoy guardado\\n');

    // Guardar tasas para ayer
    console.log('Guardando tasas para ayer...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await bcvHistoryService.saveRates(49.5, 54.2, 'BCV', yesterday);
    await binanceHistoryService.saveRates(48.8, yesterday);
    console.log('✅ Ayer guardado\\n');

    // Guardar tasas para hace 7 días
    console.log('Guardando tasas para hace 7 días...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await bcvHistoryService.saveRates(45.5, 50.2, 'BCV', sevenDaysAgo);
    await binanceHistoryService.saveRates(44.8, sevenDaysAgo);
    console.log('✅ Hace 7 días guardado\\n');

    // Verificar las fechas
    const todayKey = formatCaracasDayKey(new Date());
    const yesterdayKey = formatCaracasDayKey(yesterday);
    const sevenDaysAgoKey = formatCaracasDayKey(sevenDaysAgo);

    const bcvToday = await bcvHistoryService.getRatesForDate(todayKey);
    const bcvYesterday = await bcvHistoryService.getRatesForDate(yesterdayKey);
    const bcvSevenDaysAgo = await bcvHistoryService.getRatesForDate(sevenDaysAgoKey);

    console.log('%cResultados:', 'font-weight: bold; font-size: 14px');
    console.log(\`  Hoy (\${todayKey}): USD \${bcvToday?.usd}, EUR \${bcvToday?.eur}\`);
    console.log(\`  Ayer (\${yesterdayKey}): USD \${bcvYesterday?.usd}, EUR \${bcvYesterday?.eur}\`);
    console.log(\`  Hace 7 días (\${sevenDaysAgoKey}): USD \${bcvSevenDaysAgo?.usd}, EUR \${bcvSevenDaysAgo?.eur}\`);

    const allDatesUnique =
      bcvToday?.date !== bcvYesterday?.date &&
      bcvYesterday?.date !== bcvSevenDaysAgo?.date &&
      bcvToday?.date !== bcvSevenDaysAgo?.date;

    if (allDatesUnique) {
      console.log('%c✅ ÉXITO! Todas las fechas son diferentes!', 'font-weight: bold; color: #10b981; font-size: 16px');
    } else {
      console.log('%c❌ ERROR! Las fechas son iguales', 'font-weight: bold; color: #ef4444; font-size: 16px');
    }

    // Mostrar todo el historial
    console.log('\\n%cHistorial completo:', 'font-weight: bold; color: #8b5cf6');
    const allRates = await bcvHistoryService.getHistoricalRates(30);
    console.table(allRates.map(r => ({
      Fecha: r.date,
      USD: r.usd,
      EUR: r.eur,
      Fuente: r.source
    })));

  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
```

1. **Presiona Enter** y observa los resultados

### Opción 2: Verificar en IndexedDB

1. **Abre DevTools** (F12)
2. **Ve a la pestaña Application** (o Aplicación)
3. **En el panel izquierdo, expande "IndexedDB"**
4. **Expande "BCVHistoryDB"**
5. **Haz clic en "bcvHistory"**
6. **Verifica que hay registros con fechas diferentes** (columna "date")

### Opción 3: Usar el Componente de Historial

1. **Abre la aplicación**
2. **Busca el botón "Historial de Tasas"** (ícono de History)
3. **Haz clic para abrir el modal**
4. **Verifica que se muestran múltiples fechas diferentes**
5. **Las tasas deberían variar entre fechas**

## Verificación Exitosa

Deberías ver:

- ✅ Fechas diferentes para cada registro (hoy, ayer, hace 7 días)
- ✅ Tasas diferentes para cada fecha
- ✅ El historial muestra múltiples entradas con fechas únicas
- ✅ No hay duplicados de la misma fecha con valores diferentes

## Solución de Problemas

Si todas las fechas son iguales:

1. Verifica que los cambios en los archivos se guardaron correctamente
2. Reinicia el servidor de desarrollo (`npm run dev`)
3. Limpia el caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
4. Borra IndexedDB y vuelve a probar:

   ```javascript
   // En la consola del navegador
   indexedDB.deleteDatabase('BCVHistoryDB');
   indexedDB.deleteDatabase('BinanceHistoryDB');
   ```
