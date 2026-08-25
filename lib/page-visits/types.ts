export type VisitsRange = '7d' | '30d' | '90d';
export type PageVisitInput = {
  path: string;
  visitedAt?: Date;
  ipAddress?: string;
  countryCode?: string;
};
export type PageVisitsDTO = {
  range: VisitsRange;
  startDate: string;
  endDate: string;
  totalPageViews: number;
  totalUniqueVisitors: number;
  daily: Array<{ date: string; pageViews: number; uniqueVisitors: number }>;
  topRoutes: Array<{ path: string; pageViews: number }>;
  peaks: {
    pageViews: { date: string; value: number } | null;
    uniqueVisitors: { date: string; value: number } | null;
  };
};
