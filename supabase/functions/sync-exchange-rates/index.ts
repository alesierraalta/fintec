// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { collectExchangeRates } from './shared';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const logger = {
  info: (message, meta) => console.log(message, meta ?? {}),
  warn: (message, meta) => console.warn(message, meta ?? {}),
  error: (message, meta) => console.error(message, meta ?? {}),
};

async function handleRequest() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const bcvUrl = Deno.env.get('BCV_RATES_SOURCE_URL');
  const binanceUrl = Deno.env.get('BINANCE_RATES_SOURCE_URL');

  if (!supabaseUrl || !serviceRoleKey || !bcvUrl || !binanceUrl) {
    return json(500, {
      success: false,
      error:
        'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BCV_RATES_SOURCE_URL, or BINANCE_RATES_SOURCE_URL',
    });
  }

  const { rates, errors, runDate } = await collectExchangeRates({
    bcvUrl,
    binanceUrl,
    logger,
  });

  if (rates.length === 0) {
    return json(502, {
      success: false,
      error: 'No provider returned valid exchange rates',
      errors,
      runDate,
    });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const payload = rates.map((rate) => ({
    base_currency: rate.baseCurrency,
    quote_currency: rate.quoteCurrency,
    rate: rate.rate,
    date: rate.date,
    provider: rate.provider,
  }));

  const { error } = await client
    .from('exchange_rates')
    .upsert(payload, {
      onConflict: 'base_currency,quote_currency,date,provider',
    });

  if (error) {
    logger.error('Failed to upsert exchange rates from edge function', {
      error: error.message,
      runDate,
    });
    return json(500, {
      success: false,
      error: error.message,
      errors,
      runDate,
    });
  }

  logger.info('Exchange-rate edge function completed', {
    runDate,
    savedCount: payload.length,
    errorCount: errors.length,
  });

  return json(200, {
    success: true,
    runDate,
    savedCount: payload.length,
    errorCount: errors.length,
    errors,
  });
}

Deno.serve(handleRequest);
