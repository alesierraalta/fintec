'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/money';
import type {
  Category,
  Transaction,
  PaginatedResult,
  TransactionFilters,
  PaginationParams,
} from '@/types';
import { getDescendantIds } from '@/lib/categories';

const PAGE_SIZE = 50;

interface TransactionRepository {
  transactions: {
    findByFilters(
      filters: TransactionFilters,
      pagination?: PaginationParams
    ): Promise<PaginatedResult<Transaction>>;
  };
}
const btn =
  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/20 disabled:opacity-30';
const ctr =
  'flex flex-col items-center justify-center py-12 text-muted-foreground';

const Controls = (p: {
  incDesc: boolean;
  setIncDesc: (v: boolean) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  dateErr: string | null;
}) => (
  <div className="space-y-3 py-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">
        Include descendants
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={p.incDesc}
        aria-label="Include descendants"
        onClick={() => p.setIncDesc(!p.incDesc)}
        className={btn}
      >
        {p.incDesc ? '[x]' : '[ ]'}
      </button>
    </div>
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="block text-xs text-muted-foreground" htmlFor="df">
          From
        </label>
        <input
          id="df"
          type="date"
          value={p.dateFrom}
          onChange={(e) => p.setDateFrom(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border/40 bg-card/60 px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex-1">
        <label className="block text-xs text-muted-foreground" htmlFor="dt">
          To
        </label>
        <input
          id="dt"
          type="date"
          value={p.dateTo}
          onChange={(e) => p.setDateTo(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border/40 bg-card/60 px-3 py-2 text-sm text-foreground"
        />
      </div>
    </div>
    {p.dateErr && (
      <p className="flex items-center gap-1 text-xs text-destructive">
        ! {p.dateErr}
      </p>
    )}
  </div>
);

export function CategoryTransactionDrilldown({
  category,
  categories,
  repository,
  refreshKey,
  onClose,
  onEdit,
}: {
  category: Category | null;
  categories: Category[];
  repository: TransactionRepository;
  refreshKey: number;
  onClose: () => void;
  onEdit: (t: Transaction) => void;
}) {
  const [incDesc, setIncDesc] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateErr, setDateErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<PaginatedResult<Transaction> | null>(
    null
  );
  const rid = useRef(0);
  const prevRefreshKey = useRef(refreshKey);

  useEffect(() => {
    setPage(1);
  }, [category?.id, incDesc, dateFrom, dateTo, refreshKey]);

  const fetch = useCallback(async () => {
    if (!category) return;
    const fid = ++rid.current;
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setDateErr('Start date must be before or equal to end date');
      setResult(null);
      setLoading(false);
      return;
    }
    setDateErr(null);
    setLoading(true);
    setErr(null);
    try {
      const catIds = incDesc
        ? getDescendantIds(category.id, categories)
        : [category.id];
      const f: TransactionFilters = {};
      if (catIds.length) f.categoryIds = catIds;
      if (dateFrom) f.dateFrom = dateFrom;
      if (dateTo) f.dateTo = dateTo;
      const d = await repository.transactions.findByFilters(f, {
        page,
        limit: PAGE_SIZE,
        sortBy: 'date',
        sortOrder: 'desc',
      });
      if (fid === rid.current) setResult(d);
    } catch (e) {
      if (fid === rid.current)
        setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      if (fid === rid.current) setLoading(false);
    }
  }, [
    category,
    categories,
    incDesc,
    dateFrom,
    dateTo,
    page,
    repository.transactions,
  ]);

  useEffect(() => {
    if (prevRefreshKey.current !== refreshKey) {
      prevRefreshKey.current = refreshKey;
    }
    fetch();
  }, [fetch, refreshKey]);
  if (!category) return null;

  const showErr = err || dateErr;

  return (
    <Modal
      open={!!category}
      onClose={onClose}
      title={category.name}
      closeButtonClassName="min-h-[44px] min-w-[44px]"
      className="!mx-0 h-[100dvh] max-h-none w-full max-w-none rounded-none border-0 pb-safe-bottom pl-safe-left pr-safe-right pt-safe-top sm:!ml-auto sm:!mr-0 sm:h-[100dvh] sm:max-h-none sm:w-[min(42rem,100vw)] sm:max-w-none sm:rounded-none sm:rounded-l-3xl sm:border-l"
    >
      <Controls
        incDesc={incDesc}
        setIncDesc={setIncDesc}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        dateErr={dateErr}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-0 py-2">
        {!loading && showErr && (
          <div className={`${ctr} text-destructive`}>
            <p className="text-sm text-destructive">{showErr}</p>
          </div>
        )}
        {loading && (
          <div className={ctr}>
            <p className="text-sm">Loading transactions&hellip;</p>
          </div>
        )}
        {!loading && !showErr && result && result.total === 0 && (
          <div className={ctr}>
            <p className="text-sm">
              {!dateFrom && !dateTo && incDesc
                ? 'No transactions for this category'
                : 'No matches \u2014 try adjusting your filters'}
            </p>
          </div>
        )}
        {!loading && !showErr && result && result.data.length > 0 && (
          <ul className="divide-y divide-border/30" role="list">
            {result.data.map((t: Transaction) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {t.description || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium tabular-nums ${t.type === 'INCOME' ? 'text-green-500' : 'text-red-400'}`}
                  >
                    {formatCurrency(t.amountMinor, t.currencyCode)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(t)}
                    aria-label={`Edit transaction ${t.description || ''}`}
                    className={btn}
                  >
                    &#9998;
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sticky bottom-0 flex items-center justify-between border-t border-border/30 bg-card/90 px-0 py-3">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label="Previous page"
          className={btn}
        >
          &lt;
        </button>
        <span className="text-xs text-muted-foreground">
          {result ? `${result.page} / ${result.totalPages}` : '\u2014'}
        </span>
        <button
          type="button"
          disabled={!result || page >= result.totalPages}
          onClick={() => setPage((p) => p + 1)}
          aria-label="Next page"
          className={btn}
        >
          &gt;
        </button>
      </div>
    </Modal>
  );
}
