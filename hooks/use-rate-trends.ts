import { useState, useEffect } from 'react';

interface Trend {
  percentage: number;
  direction: 'up' | 'down' | 'stable';
  period: string;
}

interface RateTrends {
  usdVes?: {
    '1d': Trend;
    '1w': Trend;
    '1m': Trend;
  };
}

export function useRateTrends() {
  const [trends, setTrends] = useState<RateTrends | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const response = await fetch('/api/trends');
        if (!response.ok) throw new Error('Failed to fetch trends');
        const data = await response.json();
        setTrends(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrends();
  }, []);

  return { trends, isLoading, error };
}
