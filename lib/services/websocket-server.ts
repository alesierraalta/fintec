import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import BackgroundScraperService from './background-scraper';

interface ExchangeRateData {
  usd_ves: number;
  usdt_ves: number;
  sell_rate: number;
  buy_rate: number;
  lastUpdated: string;
  source: string;
}

class WebSocketService {
  private io: SocketIOServer;
  private scraper: BackgroundScraperService;
  private connectedClients = 0;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.scraper = new BackgroundScraperService(60000); // 1 minute interval
    this.setupEventHandlers();
  }

  start(): void {
    console.log('Starting WebSocket service...');
    this.scraper.start((data) => {
      this.broadcastUpdate(data);
    });
  }

  stop(): void {
    console.log('Stopping WebSocket service...');
    this.scraper.stop();
    this.io.close();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.connectedClients++;
      console.log(`Client connected. Total clients: ${this.connectedClients}`);

      socket.on('disconnect', () => {
        this.connectedClients--;
        console.log(`Client disconnected. Total clients: ${this.connectedClients}`);
      });

      socket.on('request-latest-rates', () => {
        // Send latest rates immediately
        this.sendLatestRates(socket);
      });
    });
  }

  private broadcastUpdate(data: any): void {
    if (data.success && data.data) {
      // Lógica correcta: 
      // - SELL del scraper = personas que VENDEN USDT (reciben VES) = precio de VENTA para usuario
      // - BUY del scraper = personas que COMPRAN USDT (pagan VES) = precio de COMPRA para usuario
      const rateData: ExchangeRateData = {
        usd_ves: data.data.usd_ves,
        usdt_ves: data.data.usdt_ves,
        sell_rate: data.data.sell_rate, // SELL del scraper = precio de VENTA para usuario
        buy_rate: data.data.buy_rate,   // BUY del scraper = precio de COMPRA para usuario
        lastUpdated: data.data.lastUpdated,
        source: data.data.source
      };

      this.io.emit('exchange-rate-update', rateData);
      console.log(`Broadcasted exchange rate update to ${this.connectedClients} clients`);
    } else {
      console.error('Failed to broadcast update:', data.error);
    }
  }

  private sendLatestRates(socket: any): void {
    // This would typically fetch from database
    // For now, we'll send a placeholder (ya con la lógica corregida)
    socket.emit('exchange-rate-update', {
      usd_ves: 228.25,
      usdt_ves: 228.25,
      sell_rate: 228.00, // Precio de VENTA para usuario (menor precio)
      buy_rate: 228.50,  // Precio de COMPRA para usuario (mayor precio)
      lastUpdated: new Date().toISOString(),
      source: 'Background Scraper'
    });
  }
}

export default WebSocketService;
