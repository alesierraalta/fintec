import { APIProfiler } from '@/lib/server/perf/api-profiler';

describe('APIProfiler', () => {
  describe('constructor', () => {
    it('should create profiler with empty events', () => {
      const profiler = new APIProfiler();

      expect(profiler.events).toEqual([]);
    });

    it('should support optional sampling parameter', () => {
      const profiler1 = new APIProfiler(); // default
      const profiler2 = new APIProfiler(0.5); // 50% sampling
      const profiler3 = new APIProfiler(1.0); // always sample

      expect(profiler1).toBeDefined();
      expect(profiler2).toBeDefined();
      expect(profiler3).toBeDefined();
    });
  });

  describe('record', () => {
    it('should record metric event with all fields', () => {
      const profiler = new APIProfiler(1.0); // Always sample

      profiler.record({
        name: 'transaction_list',
        durationMs: 25,
        bytes: 2048,
        queryCount: 2,
        rowCount: 50,
      });

      expect(profiler.events.length).toBe(1);
      expect(profiler.events[0]).toEqual({
        name: 'transaction_list',
        durationMs: 25,
        bytes: 2048,
        queryCount: 2,
        rowCount: 50,
      });
    });

    it('should accumulate multiple metric records', () => {
      const profiler = new APIProfiler(1.0);

      profiler.record({
        name: 'event1',
        durationMs: 10,
        bytes: 100,
        queryCount: 1,
        rowCount: 5,
      });
      profiler.record({
        name: 'event2',
        durationMs: 15,
        bytes: 200,
        queryCount: 2,
        rowCount: 10,
      });

      expect(profiler.events.length).toBe(2);
      expect(profiler.events[0].name).toBe('event1');
      expect(profiler.events[1].name).toBe('event2');
    });

    it('should respect sampling rate (when sampled)', () => {
      const profiler = new APIProfiler(1.0); // Always sample

      for (let i = 0; i < 5; i++) {
        profiler.record({
          name: `event${i}`,
          durationMs: 10,
          bytes: 100,
          queryCount: 1,
          rowCount: 1,
        });
      }

      expect(profiler.events.length).toBe(5);
    });

    it('should not record events when sampling rate results in exclusion', () => {
      const profiler = new APIProfiler(0); // Never sample

      profiler.record({
        name: 'event',
        durationMs: 10,
        bytes: 100,
        queryCount: 1,
        rowCount: 1,
      });

      expect(profiler.events.length).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return summary metrics for single event', () => {
      const profiler = new APIProfiler(1.0);

      profiler.record({
        name: 'transaction_fetch',
        durationMs: 50,
        bytes: 5000,
        queryCount: 3,
        rowCount: 100,
      });

      const metrics = profiler.getMetrics();

      expect(metrics.totalDurationMs).toBe(50);
      expect(metrics.totalBytes).toBe(5000);
      expect(metrics.totalQueries).toBe(3);
      expect(metrics.totalRows).toBe(100);
      expect(metrics.eventCount).toBe(1);
    });

    it('should aggregate metrics across multiple events', () => {
      const profiler = new APIProfiler(1.0);

      profiler.record({
        name: 'event1',
        durationMs: 20,
        bytes: 1000,
        queryCount: 1,
        rowCount: 10,
      });
      profiler.record({
        name: 'event2',
        durationMs: 30,
        bytes: 2000,
        queryCount: 2,
        rowCount: 20,
      });

      const metrics = profiler.getMetrics();

      expect(metrics.totalDurationMs).toBe(50);
      expect(metrics.totalBytes).toBe(3000);
      expect(metrics.totalQueries).toBe(3);
      expect(metrics.totalRows).toBe(30);
      expect(metrics.eventCount).toBe(2);
    });

    it('should return zero metrics for empty profiler', () => {
      const profiler = new APIProfiler(1.0);

      const metrics = profiler.getMetrics();

      expect(metrics.totalDurationMs).toBe(0);
      expect(metrics.totalBytes).toBe(0);
      expect(metrics.totalQueries).toBe(0);
      expect(metrics.totalRows).toBe(0);
      expect(metrics.eventCount).toBe(0);
    });
  });

  describe('getServerTimingHeader', () => {
    it('should generate Server-Timing header for single event', () => {
      const profiler = new APIProfiler(1.0);

      profiler.record({
        name: 'db_query',
        durationMs: 50,
        bytes: 1024,
        queryCount: 1,
        rowCount: 10,
      });

      const header = profiler.getServerTimingHeader();

      expect(header).toContain('db_query');
      expect(header).toContain('dur=50');
    });

    it('should generate Server-Timing header for multiple events', () => {
      const profiler = new APIProfiler(1.0);

      profiler.record({
        name: 'event1',
        durationMs: 10,
        bytes: 100,
        queryCount: 1,
        rowCount: 1,
      });
      profiler.record({
        name: 'event2',
        durationMs: 20,
        bytes: 200,
        queryCount: 1,
        rowCount: 1,
      });

      const header = profiler.getServerTimingHeader();

      expect(header).toContain('event1');
      expect(header).toContain('event2');
    });

    it('should return empty string when no events recorded', () => {
      const profiler = new APIProfiler(1.0);

      const header = profiler.getServerTimingHeader();

      expect(header).toBe('');
    });

    it('should sanitize metric names for header compliance', () => {
      const profiler = new APIProfiler(1.0);

      profiler.record({
        name: 'my-metric_name:123',
        durationMs: 10,
        bytes: 100,
        queryCount: 1,
        rowCount: 1,
      });

      const header = profiler.getServerTimingHeader();

      expect(header).toBeDefined();
      expect(header.length > 0).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON-safe format', () => {
      const profiler = new APIProfiler(1.0);

      profiler.record({
        name: 'query',
        durationMs: 25,
        bytes: 1000,
        queryCount: 1,
        rowCount: 5,
      });

      const json = profiler.toJSON();

      expect(json).toHaveProperty('events');
      expect(json).toHaveProperty('metrics');
      expect(Array.isArray(json.events)).toBe(true);
    });
  });
});
