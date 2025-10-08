'use client';

import { useState } from 'react';
import ExchangeRateDisplay from '@/components/exchange-rate-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

export default function BackgroundScraperTestPage() {
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const startScraper = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/background-scraper/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsScraperRunning(true);
        logger.info('Background scraper started:', data.message);
      } else {
        logger.error('Failed to start scraper:', data.error);
      }
    } catch (error) {
      logger.error('Error starting scraper:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScraper = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/background-scraper/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsScraperRunning(false);
        logger.info('Background scraper stopped:', data.message);
      } else {
        logger.error('Failed to stop scraper:', data.error);
      }
    } catch (error) {
      logger.error('Error stopping scraper:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Background Scraper Control</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              onClick={startScraper}
              disabled={isScraperRunning || isLoading}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Start Scraper</span>
            </Button>
            
            <Button
              onClick={stopScraper}
              disabled={!isScraperRunning || isLoading}
              variant="danger"
              className="flex items-center space-x-2"
            >
              <Square className="h-4 w-4" />
              <span>Stop Scraper</span>
            </Button>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Status: {isScraperRunning ? 'Running' : 'Stopped'}
            </p>
            {isLoading && (
              <p className="text-sm text-blue-600">Processing...</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ExchangeRateDisplay />
      
      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. Click &quot;Start Scraper&quot; to begin background data collection</p>
            <p>2. The scraper runs the Python script every minute</p>
            <p>3. Real-time updates are sent via WebSocket</p>
            <p>4. Data is stored in the database automatically</p>
            <p>5. No loading times - data is always fresh!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
