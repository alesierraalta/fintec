# Background Scraper Implementation

## Overview

This implementation provides a continuous background scraper that runs the Binance P2P scraper in the background, ensuring the application always has fresh exchange rate data without any loading times for users.

## Architecture

### Components

1. **Background Scraper Service** (`lib/services/background-scraper.ts`)
   - Runs Python scraper script every minute
   - Handles errors and retries
   - Manages worker thread lifecycle

2. **WebSocket Server** (`lib/services/websocket-server.ts`)
   - Real-time communication with frontend
   - Broadcasts exchange rate updates
   - Handles client connections

3. **Database Service** (`lib/services/exchange-rate-db.ts`)
   - Stores exchange rates in Supabase
   - Retrieves latest rates and history
   - Handles database operations

4. **React Hook** (`hooks/use-realtime-rates.ts`)
   - Real-time rate updates in React components
   - Connection status management
   - Error handling

5. **Manager Service** (`lib/services/background-scraper-manager.ts`)
   - Coordinates all services
   - Handles startup/shutdown
   - Manages data flow

## Features

### ✅ Continuous Operation
- Runs Python scraper every 60 seconds
- No user interaction required
- Automatic error recovery

### ✅ Real-time Updates
- WebSocket connection for instant updates
- No page refreshes needed
- Live data streaming

### ✅ Database Integration
- Stores all exchange rates
- Historical data access
- Supabase integration

### ✅ Error Handling
- Graceful error recovery
- Fallback data when needed
- Connection status monitoring

### ✅ Performance Optimized
- Background processing
- Efficient resource usage
- Minimal UI blocking

## Usage

### Starting the Background Scraper

```typescript
// API call to start scraper
const response = await fetch('/api/background-scraper/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
```

### Using Real-time Rates in Components

```typescript
import { useRealtimeRates } from '@/hooks/use-realtime-rates';

function MyComponent() {
  const { rates, isConnected, error } = useRealtimeRates();
  
  return (
    <div>
      {rates && (
        <div>USD/VES: {rates.usd_ves}</div>
      )}
    </div>
  );
}
```

### Database Schema

```sql
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  usd_ves DECIMAL(10, 2) NOT NULL,
  usdt_ves DECIMAL(10, 2) NOT NULL,
  sell_rate DECIMAL(10, 2) NOT NULL,
  buy_rate DECIMAL(10, 2) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
  source VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
```

### Scraper Settings

- **Update Interval**: 60 seconds (configurable)
- **Timeout**: 2 minutes per scraper run
- **Retry Logic**: Built-in error handling
- **Rate Limiting**: Respects API limits

## Testing

### Test Page
Visit `/background-scraper-test` to:
- Start/stop the background scraper
- View real-time exchange rates
- Monitor connection status

### Manual Testing
1. Start the scraper via API
2. Check WebSocket connection
3. Verify database storage
4. Test error scenarios

## Benefits

### For Users
- **No Loading Times**: Data is always fresh
- **Real-time Updates**: Instant rate changes
- **Reliable Data**: Continuous background updates
- **Better UX**: Seamless experience

### For Developers
- **Simple Integration**: Easy to use hooks
- **Modular Design**: Separate concerns
- **Error Resilient**: Handles failures gracefully
- **Scalable**: Can handle multiple clients

## Technical Details

### WebSocket Communication
- **Port**: 3001 (configurable)
- **Protocol**: Socket.IO
- **Events**: `exchange-rate-update`, `request-latest-rates`
- **Reconnection**: Automatic

### Database Operations
- **Storage**: Every scraper run stored
- **Retrieval**: Latest rates cached
- **History**: Configurable limit
- **Security**: RLS enabled

### Error Handling
- **Scraper Failures**: Fallback to cached data
- **Network Issues**: Automatic reconnection
- **Database Errors**: Graceful degradation
- **Timeout Handling**: 2-minute limit

## Monitoring

### Logs
- Scraper execution logs
- WebSocket connection logs
- Database operation logs
- Error tracking

### Metrics
- Update frequency
- Success rate
- Connection count
- Data freshness

## Future Enhancements

1. **Multiple Data Sources**: Add more exchange rate sources
2. **Caching Layer**: Redis for better performance
3. **Analytics**: Rate trend analysis
4. **Alerts**: Price change notifications
5. **API Rate Limiting**: Smart request management

## Troubleshooting

### Common Issues

1. **Python Script Not Found**
   - Ensure `fintec/scripts/binance_scraper_fast.py` exists
   - Check Python installation

2. **WebSocket Connection Failed**
   - Verify port 3001 is available
   - Check firewall settings

3. **Database Connection Error**
   - Verify Supabase credentials
   - Check network connectivity

4. **Scraper Timeout**
   - Check Python script performance
   - Verify API availability

### Debug Mode
Enable detailed logging by setting environment variable:
```env
DEBUG_BACKGROUND_SCRAPER=true
```

## Conclusion

This background scraper implementation provides a robust, real-time solution for keeping exchange rates updated without any user-facing loading times. The modular architecture ensures maintainability and scalability while providing an excellent user experience.
