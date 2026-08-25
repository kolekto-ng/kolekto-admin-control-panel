/**
 * One page of a server-paginated list.
 *
 * `total` is the count of rows matching the current filters across the whole
 * table — supplied by PostgREST's `count=exact` Content-Range header, not by
 * measuring a downloaded array. That is what lets the pager show an accurate
 * page count while transferring only the current page.
 */
export interface Page<T> {
  rows: T[];
  total: number;
}
