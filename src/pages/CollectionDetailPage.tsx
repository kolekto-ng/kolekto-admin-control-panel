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

interface Contributor {
  id: string;
  name: string;
  amount: number;
  created_at: string;
  email: string;
  status: string;
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
  social_links: any;
  banner_url: string | null;
  story: any;
  unique_id_enabled: boolean | null;
}

const CollectionDetailPage = () => {
  const { id } = useParams();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [organizer, setOrganizer] = useState<any>(null); // Profile
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      // 1. Fetch Collection Details
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', id)
        .single();

      if (collectionError) throw collectionError;
      setCollection(collectionData);

      // 2. Fetch Organizer Profile
      if (collectionData.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', collectionData.user_id)
          .single();
        setOrganizer(userData);
      }

      // 3. Fetch Contributors
      const { data: contributionsData } = await supabase
        .from('contributions')
        .select('*')
        .eq('collection_id', id)
        .order('created_at', { ascending: false });

      setContributors(contributionsData || []);

      // 4. Fetch Withdrawals
      const { data: withdrawalsData } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('collection_id', id)
        .order('created_at', { ascending: false });

      setWithdrawals(withdrawalsData || []);

      // 5. Fetch Wallet — order by updated_at and limit 1 because legacy
      // data may contain duplicate wallet rows for the same collection
      // (missing UNIQUE constraint on wallets.collection_id).
      const { data: walletRows } = await supabase
        .from('wallets')
        .select('*')
        .eq('collection_id', id)
        .order('updated_at', { ascending: false })
        .limit(1);

      setWallet((walletRows && walletRows[0]) || null);

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

  // Financial Stats from Wallet (canonical definitions):
  //   - Total Balance    = ledger_balance    (total raised minus completed withdrawals)
  //   - Available        = available_balance (settled past T+1, withdrawable now)
  //   - Pending          = pending_balance   (received today, settles at 5am WAT next day)
  //   - Total Withdrawn  = withdrawn         (sum of completed withdrawals)
  const availableBalance = Number(wallet?.available_balance || 0);
  const pendingBalance = Number(wallet?.pending_balance || 0);
  const ledgerBalance = Number(wallet?.ledger_balance || (availableBalance + pendingBalance));
  const totalBalance = ledgerBalance; // "Total Balance" per product definition
  const totalWithdrawn = Number(wallet?.withdrawn || 0);

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

      // Priority 1: Match by explicit Tier Name in contributor_information
      // This handles cases where the paid amount differs from tier price (e.g. fees included)
      if (c.contributor_information && Array.isArray(c.contributor_information) && c.contributor_information.length > 0) {
        const info = c.contributor_information[0];
        // Check if info.Tier matches tierName (case-insensitive for safety)
        if (info.Tier && String(info.Tier).toLowerCase() === String(tierName).toLowerCase()) {
          return true;
        }
      }

      // Priority 2: Fallback to fuzzy amount matching if explicit tier info is missing
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
                  <span className="text-sm text-muted-foreground">Available</span>
                  <span className="font-medium text-green-600">{formatCurrency(availableBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending (T+1)</span>
                  <span className="font-medium text-amber-600">{formatCurrency(pendingBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Withdrawn</span>
                  <span className="font-medium">{formatCurrency(totalWithdrawn)}</span>
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
