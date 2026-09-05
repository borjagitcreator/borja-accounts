export interface RangeFilter {
  type: 'all' | '6m' | '3m' | '1m' | 'year';
  year?: number;
}

export const DEFAULT_RANGE_FILTER: RangeFilter = { type: 'all' };
