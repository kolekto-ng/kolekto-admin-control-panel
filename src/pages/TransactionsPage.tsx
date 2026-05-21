import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/stores/dashboardStore";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const TransactionsPage = () => {
    const [date, setDate] = useState<DateRange | undefined>();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            let contributionsQuery = supabase
                .from("contributions")
                .select(
                    `
            id, amount, created_at, status, name,
            collections(title)
          `
                )
                .order("created_at", { ascending: false });

            let withdrawalsQuery = supabase
                .from("withdrawals")
                .select(
                    `
            id, amount, created_at, status, user_id,
            collections(title)
          `
                )
                .order("created_at", { ascending: false });

            if (date?.from) {
                const startDate = startOfDay(date.from).toISOString();
                const endDate = endOfDay(date.to || date.from).toISOString();

                contributionsQuery = contributionsQuery
                    .gte("created_at", startDate)
                    .lte("created_at", endDate);

                withdrawalsQuery = withdrawalsQuery
                    .gte("created_at", startDate)
                    .lte("created_at", endDate);
            }

            console.log('Fetching transactions with date:', date);

            const [contributionsResponse, withdrawalsResponse] = await Promise.all([
                contributionsQuery,
                withdrawalsQuery,
            ]);

            console.log('Contributions data:', contributionsResponse.data);
            console.log('Contributions error:', contributionsResponse.error);
            console.log('Withdrawals data:', withdrawalsResponse.data);
            console.log('Withdrawals error:', withdrawalsResponse.error);

            if (contributionsResponse.error) throw contributionsResponse.error;
            if (withdrawalsResponse.error) throw withdrawalsResponse.error;

            const recentContributions = contributionsResponse.data || [];
            const recentWithdrawals = withdrawalsResponse.data || [];

            // Create transactions array from contributions and withdrawals
            const allTransactions: Transaction[] = [
                ...recentContributions.map((contribution: any) => ({
                    id: contribution.id,
                    amount: contribution.amount,
                    type: "contribution" as const,
                    description: `Contribution to ${contribution.collections?.title || "Unknown Collection"
                        }`,
                    date: contribution.created_at,
                    status:
                        contribution.status === "paid"
                            ? ("success" as const)
                            : ("pending" as const),
                    user: contribution.name || "Anonymous",
                    collection: contribution.collections?.title || "Unknown Collection",
                })),
                ...recentWithdrawals.map((withdrawal: any) => ({
                    id: withdrawal.id,
                    amount: withdrawal.amount,
                    type: "withdrawal" as const,
                    description: `Withdrawal from ${withdrawal.collections?.title || "Unknown Collection"
                        }`,
                    date: withdrawal.created_at,
                    status:
                        withdrawal.status === "approved"
                            ? ("success" as const)
                            : withdrawal.status === "rejected"
                                ? ("failed" as const)
                                : ("pending" as const),
                    user: "Organizer",
                    collection: withdrawal.collections?.title || "Unknown Collection",
                })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setTransactions(allTransactions);
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                end = 4;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            if (start > 2) {
                pages.push('ellipsis1');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 1) {
                pages.push('ellipsis2');
            }

            pages.push(totalPages);
        }

        return pages.map((page, index) => {
            if (page === 'ellipsis1' || page === 'ellipsis2') {
                return (
                    <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                    </PaginationItem>
                );
            }

            return (
                <PaginationItem key={page}>
                    <PaginationLink
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page as number);
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                    >
                        {page}
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
                    <DatePickerWithRange date={date} setDate={setDate} />
                </div>
            </div>

            <Card className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span>Loading transactions...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <RecentTransactions transactions={paginatedTransactions} />
                        {totalPages > 1 && (
                            <div className="flex justify-center pt-4 border-t">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                                                }}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                        {renderPageNumbers()}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                                }}
                                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default TransactionsPage;
