import { useCallback, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTransactionsList } from "@/features/transactions/queries";
import { useListParams } from "@/hooks/useListParams";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { TableSkeleton, RefreshingIndicator } from "@/components/ui/table-skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 10;

const DEFAULT_FILTERS = { from: "", to: "", type: "all", status: "all" };

const TransactionsPage = () => {
    const { filters, page, setFilters, setPage } = useListParams(DEFAULT_FILTERS);

    // The date range round-trips through the URL as two ISO instants, so a
    // filtered view survives Back, reload and sharing. The picker itself works
    // in Date objects, hence the conversion at the boundary.
    const dateRange = useMemo<DateRange | undefined>(() => {
        if (!filters.from) return undefined;
        const from = new Date(filters.from);
        if (Number.isNaN(from.getTime())) return undefined;
        const to = filters.to ? new Date(filters.to) : undefined;
        return { from, to: to && !Number.isNaN(to.getTime()) ? to : undefined };
    }, [filters.from, filters.to]);

    const setDateRange = useCallback(
        (range: DateRange | undefined) => {
            if (!range?.from) {
                setFilters({ from: "", to: "" });
                return;
            }
            setFilters({
                from: startOfDay(range.from).toISOString(),
                to: endOfDay(range.to || range.from).toISOString(),
            });
        },
        [setFilters],
    );

    const { data, isPending, isFetching } = useTransactionsList({
        page,
        pageSize: ITEMS_PER_PAGE,
        from: filters.from || null,
        to: filters.to || null,
        type: filters.type,
        status: filters.status,
    });

    const transactions = data?.rows ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const startIndex = (page - 1) * ITEMS_PER_PAGE;

    useScrollRestoration(!isPending);

    useEffect(() => {
        if (!isPending && page > totalPages) setPage(totalPages);
    }, [isPending, page, totalPages, setPage]);

    const renderPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            let start = Math.max(2, page - 1);
            let end = Math.min(totalPages - 1, page + 1);
            if (page <= 3) end = 4;
            else if (page >= totalPages - 2) start = totalPages - 3;
            if (start > 2) pages.push("ellipsis1");
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages - 1) pages.push("ellipsis2");
            pages.push(totalPages);
        }

        return pages.map((p, index) => {
            if (typeof p === "string") {
                return (
                    <PaginationItem key={`${p}-${index}`}>
                        <PaginationEllipsis />
                    </PaginationItem>
                );
            }
            return (
                <PaginationItem key={p}>
                    <PaginationLink
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                        }}
                        isActive={page === p}
                        className="cursor-pointer"
                    >
                        {p}
                    </PaginationLink>
                </PaginationItem>
            );
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <Button variant="ghost" className="w-fit p-0 hover:bg-transparent" asChild>
                    <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
                        <p className="text-muted-foreground">
                            View and filter all platform transactions.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={filters.type}
                            onValueChange={(value) => setFilters({ type: value })}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="contribution">Contributions</SelectItem>
                                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.status}
                            onValueChange={(value) => setFilters({ status: value })}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="success">Success</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>
                </div>
            </div>

            <Card className="p-6">
                {isPending ? (
                    <TableSkeleton rows={ITEMS_PER_PAGE} columns={6} />
                ) : (
                    <div className="space-y-4">
                        <RecentTransactions transactions={transactions} />

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground flex items-center gap-3">
                                <span>
                                    {total > 0
                                        ? `Showing ${startIndex + 1}–${Math.min(startIndex + ITEMS_PER_PAGE, total)} of ${total} transactions`
                                        : "No transactions found"}
                                </span>
                                <RefreshingIndicator show={isFetching} />
                            </p>

                            {totalPages > 1 && (
                                <Pagination className="w-auto mx-0">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (page > 1) setPage(page - 1);
                                                }}
                                                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                        {renderPageNumbers()}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (page < totalPages) setPage(page + 1);
                                                }}
                                                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default TransactionsPage;
