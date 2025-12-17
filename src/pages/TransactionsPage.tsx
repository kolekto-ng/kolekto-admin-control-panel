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

const TransactionsPage = () => {
    const [date, setDate] = useState<DateRange | undefined>();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);

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
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

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
                    <RecentTransactions transactions={transactions} />
                )}
            </Card>
        </div>
    );
};

export default TransactionsPage;
