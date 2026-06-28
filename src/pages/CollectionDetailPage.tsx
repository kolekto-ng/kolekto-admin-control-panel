import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, Wallet, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { axiosInstance } from '@/lib/axios';

interface Contributor {
  id: string;
  name: string;
  amount: number;
  created_at: string;
  email?: string;
  status: string;
  contributor_information?: any;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface CollectionDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  amount: number;
  total_contributions: number;
  type: string;
  collection_type: string | null;
  max_contributions: number | null;
  user_id: string;
  currency: string;
  total_contributions_count?: number;
  currency_symbol: string;
  contributions_fields: any;
  price_tiers: any;
  deadline: string | null;
  support_phone_number: string | null;
  // New fields
  slug: string | null;
  rejection_reason: string | null;
  min_contribution: number | null;
  target_amount: number | null;
  event_date: string | null;
  ticket_mode: string | null;
  allow_multiple_quantity: boolean | null;
  is_open_ended: boolean | null;
  auto_close: boolean | null;
  campaign_category: string | null;
  campaign_summary: string | null;
  campaign_country: string | null;
  social_links?: any;
  banner_url?: string | null;
  story?: any;
  unique_id_enabled?: boolean | null;
}

const CollectionDetailPage = () => {
  const { id } = useParams();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [organizer, setOrganizer] = useState<any>(null); // Profile
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  // Live-recomputed wallet snapshot from the backend (GET .../wallet-live).
  // Reuses the canonical computeWalletBalances() so the settled↔pending split
  // is correct as of right now, instead of the cached `wallets` columns which
  // go stale after a settlement window passes with no wallet write.
  const [liveWallet, setLiveWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      // 1. Fetch Collection Details, Organizer Profile, Wallet, Contributions, and Withdrawals (consolidated query)
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          amount,
          total_contributions,
          type,
          collection_type,
          max_contributions,
          user_id,
          currency,
          currency_symbol,
          contributions_fields,
          price_tiers,
          deadline,
          support_phone_number,
          slug,
          rejection_reason,
          min_contribution,
          target_amount,
          event_date,
          ticket_mode,
          allow_multiple_quantity,
          is_open_ended,
          auto_close,
          campaign_category,
          campaign_summary,
          campaign_country,
          organizer:user_id(id, full_name, email, phone_number),
          wallets(net_payment, available_balance, pending_balance, ledger_balance, withdrawn, updated_at, created_at),
          contributions(id, name, amount, created_at, status),
          withdrawals(id, amount, status, created_at)
        `)
        .eq('id', id)
        .single();

      if (collectionError) throw collectionError;
      setCollection(collectionData);
      setOrganizer(collectionData.organizer || null);

      // Extract the wallet — handle legacy duplicate wallet rows by sorting by updated_at descending
      const walletList = collectionData.wallets;
      let selectedWallet = null;
      if (Array.isArray(walletList) && walletList.length > 0) {
        selectedWallet = [...walletList].sort((a, b) => 
          new Date(b.updated_at || b.created_at || 0).getTime() - 
          new Date(a.updated_at || a.created_at || 0).getTime()
        )[0];
      } else if (walletList && !Array.isArray(walletList)) {
        selectedWallet = walletList;
      }
      setWallet(selectedWallet);

      // Extract and sort contributors (created_at descending)
      const contributionsList = collectionData.contributions || [];
      const sortedContributors = [...contributionsList].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setContributors(sortedContributors);

      // Extract and sort withdrawals (created_at descending)
      const withdrawalsList = collectionData.withdrawals || [];
      const sortedWithdrawals = [...withdrawalsList].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setWithdrawals(sortedWithdrawals);

      // Live wallet snapshot — additive and best-effort. If the backend is
      // unreachable we silently keep the cached `wallets` columns (set above),
      // so this never blocks or breaks the page; it only upgrades the numbers
      // to a live recomputation when available.
      try {
        const { data: live } = await axiosInstance.get(
          `/adminurlabdkole/collections/${id}/wallet-live`,
        );
        if (live && (live.source === 'live' || typeof live.availableBalance === 'number')) {
          setLiveWallet(live);
        }
      } catch (liveErr) {
        console.warn('Live wallet fetch failed — falling back to cached wallet columns:', liveErr);
        setLiveWallet(null);
      }

    } catch (error) {
      console.error('Failed to load collection data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Completed</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading collection data...</span>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Collection not found</h2>
        <Button asChild className="mt-4">
          <Link to="/collections">Back to Collections</Link>
        </Button>
      </div>
    );
  }

  // Calculations
  // Total Raised = total amount ever received for this collection (net of fees).
  // Authoritative source = sum of paid contributions. Fall back to wallet.net_payment.
  const paidContributors = contributors.filter(c => c.status === 'success' || c.status === 'paid');
  const contributionsSum = paidContributors.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const raisedAmount = contributionsSum > 0 ? contributionsSum : Number(wallet?.net_payment || 0);
  const isLimited = collection.max_contributions !== null;
  const contributorCount = paidContributors.length;
  const displayContributorCount = collection.total_contributions > contributorCount ? collection.total_contributions : contributorCount;

  // Financial Stats (canonical definitions):
  //   - Total Balance    = ledger_balance    (total raised minus completed withdrawals)
  //   - Available        = available_balance (settled past T+1, withdrawable now)
  //   - Pending          = pending_balance   (received today, settles at 5am WAT next day)
  //   - Total Withdrawn  = withdrawn         (sum of completed withdrawals)
  //
  // PREFER the live snapshot (recomputed server-side via computeWalletBalances
  // on this request) so the settled↔pending split is correct even after a
  // settlement window has passed with no wallet write. Fall back to the cached
  // `wallets` columns when the live endpoint is unavailable.
  const usingLiveWallet = !!liveWallet;
  const availableBalance = usingLiveWallet
    ? Number(liveWallet.availableBalance || 0)
    : Number(wallet?.available_balance || 0);
  const pendingBalance = usingLiveWallet
    ? Number(liveWallet.pendingBalance || 0)
    : Number(wallet?.pending_balance || 0);
  const ledgerBalance = usingLiveWallet
    ? Number(liveWallet.ledgerBalance || (availableBalance + pendingBalance))
    : Number(wallet?.ledger_balance || (availableBalance + pendingBalance));
  const totalBalance = ledgerBalance; // "Total Balance" per product definition
  const totalWithdrawn = usingLiveWallet
    ? Number(liveWallet.withdrawn || 0)
    : Number(wallet?.withdrawn || 0);
  // What the host could actually withdraw right now (available minus open
  // withdrawal requests). Only available from the live endpoint.
  const withdrawableBalance = usingLiveWallet
    ? Number(liveWallet.withdrawableBalance ?? availableBalance)
    : availableBalance;

  // Type determination — use collection_type first (canonical), fall back to type
  const canonicalType = (collection.collection_type || collection.type || 'fixed').toLowerCase();
  const isFixed = canonicalType === 'fixed' || canonicalType === 'flat';
  const isTiered = canonicalType === 'tiered';
  const isFundraiser = canonicalType === 'fundraising';
  const isTicket = canonicalType === 'ticket';
  const isOpenPool = canonicalType === 'open_pool';
  const isRejected = collection.status === 'rejected';
  // For fundraising, use target_amount preferentially
  const displayTargetAmount = collection.target_amount || collection.amount || 0;
  const progressPercentage = displayTargetAmount > 0 ? Math.min(100, Math.round((raisedAmount / displayTargetAmount) * 100)) : 0;

  // Tier parsing logic update
  let tiers: any[] = [];
  try {
    if (isTiered || isTicket) {
      // Priority 1: price_tiers column (New correct location)
      if (collection.price_tiers && Array.isArray(collection.price_tiers)) {
        tiers = collection.price_tiers;
      }
      // Priority 2: contributions_fields structure fallback
      else if (collection.contributions_fields) {
        const fields = collection.contributions_fields as any;
        if (fields.tiers && Array.isArray(fields.tiers)) {
          tiers = fields.tiers;
        } else if (Array.isArray(fields)) {
          if (fields.some((f: any) => f.amount || f.price)) {
            tiers = fields;
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to parse tiers", e);
  }

  // Calculate contributors per tier
  const contributorsPerTier = tiers.map(tier => {
    // Handle 'price' vs 'amount' properties and 'name' vs 'label'
    const tierAmount = Number(tier.price || tier.amount);
    const tierName = tier.name || tier.label || 'Unnamed Tier';

     const count = contributors.filter(c => {
      if (c.status !== 'success' && c.status !== 'paid') return false;

      // Fallback to fuzzy amount matching if explicit tier info is missing
      // Allow for a small variance or fee (e.g. up to 5% higher)
      if (Math.abs(c.amount - tierAmount) < 1) return true; // Exact match

      // Check if amount is slightly higher (likely fees) but close enough (e.g., within 5%)
      // logic: c.amount is usually tierAmount + fee. So c.amount >= tierAmount.
      if (c.amount > tierAmount && c.amount <= tierAmount * 1.1) {
        // Weak signal, but better than nothing if info is missing. 
        // But be careful not to overlap tiers.
        return true;
      }

      return false;
    }).length;
    return { ...tier, amount: tierAmount, name: tierName, count };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/collections">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight">{collection.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {getStatusBadge(collection.status)}
              <Badge variant="outline" className="capitalize">
                {collection.collection_type || collection.type}
              </Badge>
              {collection.campaign_category && (
                <Badge variant="secondary" className="text-xs">{collection.campaign_category}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <a
              href={collection.slug
                ? `https://kolekto.com.ng/c/${collection.slug}`
                : `https://kolekto.com.ng/contribute/${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              View Public Page
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wider">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {collection.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Organizer</div>
                  {organizer ? (
                    <div>
                      <Link to={`/users/${organizer.id}`} className="font-medium text-primary hover:underline flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {organizer.full_name || organizer.email || "Unknown User"}
                      </Link>
                      {/* Prefer collection specific support number, then profile number */}
                      {(collection.support_phone_number || organizer.phone_number) && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center">
                          <span className="mr-1">📞</span> {collection.support_phone_number || organizer.phone_number}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm">Unknown Organizer</span>
                  )}
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">General Info</div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Created: {formatDate(collection.created_at)}</span>
                    </div>
                    {collection.deadline && (
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                        <span>Deadline: {formatDate(collection.deadline)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection Reason Alert */}
                {isRejected && collection.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:col-span-2">
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-700">{collection.rejection_reason}</p>
                  </div>
                )}

                {/* Slug display */}
                {collection.slug && (
                  <div className="bg-muted/30 p-3 rounded-lg md:col-span-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Public Slug</div>
                    <code className="text-sm font-mono text-primary">/c/{collection.slug}</code>
                  </div>
                )}

                {/* Pricing Section */}
                <div className="bg-muted/30 p-4 rounded-lg md:col-span-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pricing & Type</div>

                  {isFixed && (
                    <div className="flex items-center">
                      <span className="font-medium text-lg">{formatCurrency(collection.amount)}</span>
                      <span className="ml-2 text-sm text-muted-foreground">(Fixed Price per contributor)</span>
                    </div>
                  )}

                  {isFundraiser && (
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <span className="font-medium">{displayTargetAmount > 0 ? formatCurrency(displayTargetAmount) : 'Open-ended'}</span>
                        <span className="ml-2 text-sm text-muted-foreground">(Target Goal)</span>
                      </div>
                      {collection.min_contribution && (
                        <div className="text-xs text-muted-foreground">Min Contribution: {formatCurrency(collection.min_contribution)}</div>
                      )}
                      {collection.campaign_summary && (
                        <div className="text-sm text-gray-600 mt-2 bg-white p-2 rounded border">{collection.campaign_summary}</div>
                      )}
                      {collection.campaign_country && (
                        <div className="text-xs text-muted-foreground">Country: {collection.campaign_country}</div>
                      )}
                    </div>
                  )}

                  {isTicket && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Ticket Type:</span>
                        <Badge variant="secondary" className="capitalize text-xs">{tiers.length > 0 ? 'Tiered' : 'Fixed'}</Badge>
                      </div>
                      {collection.event_date && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Event Date:</span>
                          <span className="font-medium text-sm">{formatDate(collection.event_date)}</span>
                        </div>
                      )}
                      {collection.ticket_mode && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Ticket Mode:</span>
                          <Badge variant="outline" className="capitalize text-xs">{collection.ticket_mode}</Badge>
                        </div>
                      )}
                      
                      {tiers.length === 0 && (
                        <div className="mt-3 p-3 bg-white rounded border flex items-center justify-between">
                          <div>
                            <span className="font-medium text-lg">{formatCurrency(collection.amount || 0)}</span>
                            <p className="text-xs text-muted-foreground">Fixed Ticket Price</p>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{displayContributorCount}</span>
                            <p className="text-xs text-muted-foreground">Tickets Sold</p>
                          </div>
                        </div>
                      )}

                      {tiers.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-2">Ticket Tiers:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {contributorsPerTier.map((tier, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                <div>
                                  <span>{tier.name || `Tier ${idx + 1}`}</span>
                                  <div className="text-xs text-muted-foreground">{tier.count} sold</div>
                                </div>
                                <span className="font-bold">{formatCurrency(tier.price || tier.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isOpenPool && (
                    <div className="space-y-1">
                      {displayTargetAmount > 0 && (
                        <div className="flex items-center">
                          <span className="font-medium">{formatCurrency(displayTargetAmount)}</span>
                          <span className="ml-2 text-sm text-muted-foreground">(Target Goal)</span>
                        </div>
                      )}
                      {collection.min_contribution && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Min Contribution:</span>
                          <span className="font-medium">{formatCurrency(collection.min_contribution)}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Type: {collection.is_open_ended ? '♾ Open-ended (no deadline)' : '📅 Has deadline'}
                      </div>
                      {collection.auto_close !== null && (
                        <div className="text-xs text-muted-foreground">
                          Auto-close when target reached: {collection.auto_close ? 'Yes' : 'No'}
                        </div>
                      )}
                    </div>
                  )}

                  {isTiered && !isTicket && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-2">Available Tiers:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {contributorsPerTier.map((tier, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                            <div>
                              <span>{tier.name || `Tier ${idx + 1}`}</span>
                              <div className="text-xs text-muted-foreground">{tier.count} contributors</div>
                            </div>
                            <span className="font-bold">{formatCurrency(tier.price || tier.amount)}</span>
                          </div>
                        ))}
                        {tiers.length === 0 && <span className="text-sm text-muted-foreground">No tiers configured.</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="contributors">
            <TabsList>
              <TabsTrigger value="contributors">Contributors ({contributorCount})</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals ({withdrawals.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="contributors">
              <Card>
                <CardContent className="p-0">
                  {contributors.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                          <tr>
                            <th className="p-4 font-medium">Name</th>
                            <th className="p-4 font-medium">Amount</th>
                            <th className="p-4 font-medium">Date</th>
                            <th className="p-4 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {contributors.map((c) => (
                            <tr key={c.id} className="hover:bg-muted/10">
                              <td className="p-4 font-medium">{c.name || 'Anonymous'}</td>
                              <td className="p-4">{formatCurrency(c.amount)}</td>
                              <td className="p-4 text-muted-foreground">{formatDate(c.created_at)}</td>
                              <td className="p-4">
                                <Badge variant={c.status === 'success' || c.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                                  {c.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No contributions yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdrawals">
              <Card>
                <CardContent className="p-0">
                  {withdrawals.length > 0 ? (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="p-4 font-medium">Amount</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {withdrawals.map((w) => (
                          <tr key={w.id}>
                            <td className="p-4 font-medium">{formatCurrency(w.amount)}</td>
                            <td className="p-4">
                              <Badge variant={w.status === 'approved' || w.status === 'success' ? 'outline' : 'secondary'}>
                                {w.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-muted-foreground">{formatDate(w.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No withdrawals found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="p-6">
                  <ul className="space-y-4">
                    {/* Collection Created Event */}
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                      <div>
                        <p className="text-sm font-medium">Collection Created</p>
                        <p className="text-xs text-muted-foreground">{formatDate(collection.created_at)}</p>
                      </div>
                    </li>
                    {/* Mix of other events (simplified for now) */}
                    {contributors.slice(0, 5).map(c => (
                      <li key={`act-c-${c.id}`} className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                        <div>
                          <p className="text-sm">Contribution received: {formatCurrency(c.amount)} from {c.name || 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                        </div>
                      </li>
                    ))}
                    {withdrawals.map(w => (
                      <li key={`act-w-${w.id}`} className="flex items-start">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3"></div>
                        <div>
                          <p className="text-sm">Withdrawal request: {formatCurrency(w.amount)} ({w.status})</p>
                          <p className="text-xs text-muted-foreground">{formatDate(w.created_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Total Raised</span>
                  <span className="font-bold text-lg">{formatCurrency(raisedAmount)}</span>
                </div>
                {(isFundraiser || isOpenPool) && displayTargetAmount > 0 && (
                  <>
                    <Progress value={progressPercentage} className="h-2 mb-1" />
                    <div className="text-xs text-right text-muted-foreground">{progressPercentage}% of {formatCurrency(displayTargetAmount)}</div>
                  </>
                )}
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Balance</span>
                  <span className="font-medium">{formatCurrency(totalBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Available (settled)</span>
                  <span className="font-medium text-green-600">{formatCurrency(availableBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Withdrawable now</span>
                  <span className="font-medium text-green-700">{formatCurrency(withdrawableBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending (T+1)</span>
                  <span className="font-medium text-amber-600">{formatCurrency(pendingBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Withdrawn</span>
                  <span className="font-medium">{formatCurrency(totalWithdrawn)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground pt-1">
                  {usingLiveWallet
                    ? 'Live balances (recomputed now, T+1 settlement applied)'
                    : 'Cached balances — live recompute unavailable'}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-muted-foreground">Total Contributors</span>
                  <div className="flex items-center font-medium">
                    <Users className="h-4 w-4 mr-2" />
                    {displayContributorCount}
                    {isLimited && <span className="text-xs text-muted-foreground ml-1">/ {collection.max_contributions}</span>}
                  </div>
                </div>

                {/* Tier Breakdown */}
                {(isTiered || (isTicket && tiers.length > 0)) && contributorsPerTier.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Contributors per Tier</p>
                    <div className="space-y-1">
                      {contributorsPerTier.map((t, idx) => (
                        <div key={idx} className="flex justify-between text-xs items-center">
                          <span>{t.name} <span className="text-muted-foreground">({formatCurrency(t.price || t.amount)})</span></span>
                          <span className="font-medium">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                {id}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">Collection ID</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CollectionDetailPage;
