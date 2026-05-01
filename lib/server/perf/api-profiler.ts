/**
 * Metric event recorded by the profiler
 */
export interface MetricEvent {
  name: string;
  durationMs: number;
  bytes: number;
  queryCount: number;
  rowCount: number;
}

/**
 * Aggregated metrics summary
 */
export interface MetricsSummary {
  totalDurationMs: number;
  totalBytes: number;
  totalQueries: number;
  totalRows: number;
  eventCount: number;
}

/**
 * APIProfiler tracks request-level performance metrics for instrumentation.
 * Records are sampled based on sampling rate to minimize overhead.
 */
export class APIProfiler {
  private samplingRate: number;
  events: MetricEvent[] = [];

  constructor(samplingRate: number = 0.1) {
    // Clamp sampling rate to [0, 1]
    this.samplingRate = Math.min(1, Math.max(0, samplingRate));
  }

  /**
   * Record a metric event if sampling rate permits
   */
  record(event: MetricEvent): void {
    if (Math.random() > this.samplingRate) {
      return;
    }

    this.events.push(event);
  }

  /**
   * Get aggregated metrics across all recorded events
   */
  getMetrics(): MetricsSummary {
    return {
      totalDurationMs: this.events.reduce((sum, e) => sum + e.durationMs, 0),
      totalBytes: this.events.reduce((sum, e) => sum + e.bytes, 0),
      totalQueries: this.events.reduce((sum, e) => sum + e.queryCount, 0),
      totalRows: this.events.reduce((sum, e) => sum + e.rowCount, 0),
      eventCount: this.events.length,
    };
  }

  /**
   * Generate Server-Timing header value for response headers
   * Format: name;dur=X, name2;dur=Y
   * See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
   */
  getServerTimingHeader(): string {
    if (this.events.length === 0) {
      return '';
    }

    return this.events
      .map((event) => {
        const sanitized = event.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `${sanitized};dur=${event.durationMs}`;
      })
      .join(', ');
  }

  /**
   * Serialize to JSON-safe format for structured logging
   */
  toJSON() {
    return {
      events: this.events,
      metrics: this.getMetrics(),
    };
  }
}
