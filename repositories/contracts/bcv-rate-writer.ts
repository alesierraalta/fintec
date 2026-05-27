export interface BCVRateWriter {
  write(data: {
    usd: number;
    eur: number;
    source: string;
    lastUpdated: string;
  }): Promise<boolean>;
}
