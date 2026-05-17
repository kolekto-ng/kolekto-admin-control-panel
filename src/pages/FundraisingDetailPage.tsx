
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, PauseCircle, PlayCircle, Lock,
  ExternalLink, FileText, Image, Users, Target, Calendar,
  Phone, MapPin, Tag, Twitter, Instagram, Facebook, Loader2, Heart,
  TrendingUp, Globe, Link as LinkIcon, Infinity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { useFundraisingStore, CampaignStatus } from '@/stores/fundraisingStore';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_verification: { label: 'Pending Approval', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  active: { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  paused: { label: 'Paused', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  completed: { label: 'Completed', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const FundraisingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedCampaign, detailLoading, error, fetchCampaignById, approveCampaign, rejectCampaign, pauseCampaign, resumeCampaign, closeCampaign } = useFundraisingStore();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [viewingDocName, setViewingDocName] = useState<string | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);

  useEffect(() => {
    if (id) fetchCampaignById(id);
  }, [id, fetchCampaignById]);

  // Generate signed URLs for verification documents
  useEffect(() => {
    const loadDocUrls = async () => {
      if (!selectedCampaign?.verification_documents?.length) return;
      const urls: Record<string, string> = {};
      for (const doc of selectedCampaign.verification_documents) {
        try {
          // Check if document_url is a base64 data URL
          if (doc.document_url.startsWith('data:')) {
            // It's already a data URL (base64) — use it directly
            urls[doc.id] = doc.document_url;
          } else if (doc.document_url.startsWith('http') || doc.document_url.startsWith('https')) {
            // It's already a full URL (public URL from storage)
            urls[doc.id] = doc.document_url;
          } else {
            // It's a storage path — try to create a signed URL
            const { data } = await supabase.storage
              .from('campaign-documents')
              .createSignedUrl(doc.document_url, 3600);
            if (data?.signedUrl) {
              urls[doc.id] = data.signedUrl;
            } else {
              // Try as a public URL fallback
              const { data: publicData } = supabase.storage
                .from('campaign-documents')
                .getPublicUrl(doc.document_url);
              urls[doc.id] = publicData?.publicUrl || doc.document_url;
            }
          }
        } catch (err) {
          console.error(`Failed to load document URL for ${doc.id}:`, err);
          // Last resort — use the raw path
          urls[doc.id] = doc.document_url;
        }
      }
      setDocUrls(urls);
    };
    loadDocUrls();
  }, [selectedCampaign?.verification_documents]);

  // Open a document inline — handles base64 data URLs (images & PDFs) and signed URLs
  const openDocument = (url: string, name: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      // Convert base64 data URL to a Blob URL so browsers can open it
      try {
        const [header, base64Data] = url.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
        const byteChars = atob(base64Data);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        if (mimeType.startsWith('image/')) {
          setViewingDocUrl(url); // images shown inline in modal
          setViewingDocName(name);
          setShowDocViewer(true);
        } else {
          // PDF or other — open blob URL in new tab
          window.open(blobUrl, '_blank');
        }
      } catch {
        // Fallback: show inline
        setViewingDocUrl(url);
        setViewingDocName(name);
        setShowDocViewer(true);
      }
    } else {
      // Signed or public URL — show in modal for images, new tab for PDFs
      const lower = url.toLowerCase();
      if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)/) || url.includes('image')) {
        setViewingDocUrl(url);
        setViewingDocName(name);
        setShowDocViewer(true);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading('approve');
    const result = await approveCampaign(id);
    setActionLoading(null);
    if (result.success) {
      toast({ title: '✅ Campaign Approved', description: 'The campaign is now active and visible to the public.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to approve campaign', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    setActionLoading('reject');
    const result = await rejectCampaign(id, rejectReason);
    setActionLoading(null);
    setShowRejectDialog(false);
    setRejectReason('');
    if (result.success) {
      toast({ title: '❌ Campaign Rejected', description: 'The campaign has been rejected.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to reject campaign', variant: 'destructive' });
    }
  };

  const handlePause = async () => {
    if (!id) return;
    setActionLoading('pause');
    const result = await pauseCampaign(id);
    setActionLoading(null);
    if (result.success) {
      toast({ title: '⏸ Campaign Paused', description: 'The campaign has been paused.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to pause', variant: 'destructive' });
    }
  };

  const handleResume = async () => {
    if (!id) return;
    setActionLoading('resume');
    const result = await resumeCampaign(id);
    setActionLoading(null);
    if (result.success) {
      toast({ title: '▶ Campaign Resumed', description: 'The campaign is now active again.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to resume', variant: 'destructive' });
    }
  };

  const handleClose = async () => {
    if (!id) return;
    setActionLoading('close');
    const result = await closeCampaign(id);
    setActionLoading(null);
    setShowCloseDialog(false);
    if (result.success) {
      toast({ title: '🔒 Campaign Closed', description: 'The campaign has been closed.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to close', variant: 'destructive' });
    }
  };

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading campaign details...</span>
      </div>
    );
  }

  if (!selectedCampaign || selectedCampaign.id !== id) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Campaign not found</h2>
        <Button asChild className="mt-4">
          <Link to="/fundraising">Back to Fundraising</Link>
        </Button>
      </div>
    );
  }

  const campaign = selectedCampaign;
  const status = campaign.status as CampaignStatus | null;
  const statusCfg = STATUS_CONFIG[status || 'draft'];
  const isPending = status === 'pending_verification' || status === 'pending';
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isRejected = status === 'rejected';
  const isClosed = status === 'closed' || status === 'completed';

  const targetAmount = campaign.target_amount || 0;
  const raisedAmount = campaign.total_raised || 0;
  const progressPct = targetAmount > 0 ? Math.min(100, Math.round((raisedAmount / targetAmount) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/fundraising"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{campaign.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
              {campaign.category && (
                <Badge variant="secondary" className="text-xs">{campaign.category}</Badge>
              )}
              {isPending && (
                <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  ⚡ Awaiting Your Review
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Campaign Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.main_image_url && (
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={campaign.main_image_url}
                    alt={campaign.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              {campaign.summary && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
                  <p className="text-sm text-gray-700">{campaign.summary}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Target</span>
                  </div>
                  <p className="font-semibold">{targetAmount > 0 ? formatCurrency(targetAmount) : 'Open-ended'}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Min Contribution</span>
                  </div>
                  <p className="font-semibold">{campaign.min_contribution ? formatCurrency(campaign.min_contribution) : 'Free'}</p>
                </div>
                {campaign.deadline && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Deadline</span>
                    </div>
                    <p className="font-semibold text-sm">{formatDate(campaign.deadline)}</p>
                  </div>
                )}
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Location</span>
                  </div>
                  <p className="font-semibold text-sm">{[campaign.city, campaign.country].filter(Boolean).join(', ') || 'Nigeria'}</p>
                </div>
                {campaign.phone_number && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Phone</span>
                    </div>
                    <p className="font-semibold text-sm">{campaign.phone_number}</p>
                  </div>
                )}
                {campaign.keywords && campaign.keywords.length > 0 && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Keywords</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {campaign.keywords.slice(0, 4).map((kw, i) => (
                        <span key={i} className="text-xs bg-white border rounded px-1.5 py-0.5">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Open-Ended / Auto-Close */}
              {campaign.is_open_ended && (
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                  <Infinity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Open-ended campaign — no deadline, accepts ongoing contributions</span>
                </div>
              )}

              {/* Social Links — full list */}
              {campaign.social_links && campaign.social_links.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Social Links</p>
                  <div className="flex flex-wrap gap-3">
                    {campaign.social_links.map((link: any, i: number) => {
                      const platform = (link?.platform || '').toLowerCase();
                      let Icon = Globe;
                      let colorClass = 'text-gray-600';
                      if (platform.includes('twitter') || platform.includes('x')) { Icon = Twitter; colorClass = 'text-blue-400'; }
                      else if (platform.includes('instagram')) { Icon = Instagram; colorClass = 'text-pink-500'; }
                      else if (platform.includes('facebook')) { Icon = Facebook; colorClass = 'text-blue-700'; }
                      else if (platform.includes('linkedin')) { colorClass = 'text-blue-600'; }
                      else if (platform.includes('youtube')) { colorClass = 'text-red-600'; }
                      else if (platform.includes('tiktok')) { colorClass = 'text-gray-800'; }
                      return link?.url ? (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-sm hover:underline ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                          {link.platform}
                        </a>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Story Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Story</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.story_for ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Who is this for?</p>
                  <p className="text-sm text-gray-700 bg-muted/20 rounded p-3">{campaign.story_for}</p>
                </div>
              ) : null}
              {campaign.story_why ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Why is this fundraiser needed?</p>
                  <p className="text-sm text-gray-700 bg-muted/20 rounded p-3">{campaign.story_why}</p>
                </div>
              ) : null}
              {campaign.story_achieve ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What will the funds achieve?</p>
                  <p className="text-sm text-gray-700 bg-muted/20 rounded p-3">{campaign.story_achieve}</p>
                </div>
              ) : null}
              {!campaign.story_for && !campaign.story_why && !campaign.story_achieve && (
                <p className="text-sm text-muted-foreground italic">No story details provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Verification Docs, Images, Donations */}
          <Tabs defaultValue="documents">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-1.5" />
                Documents ({campaign.verification_documents.length})
              </TabsTrigger>
              <TabsTrigger value="images">
                <Image className="h-4 w-4 mr-1.5" />
                Images ({campaign.campaign_images.length})
              </TabsTrigger>
              <TabsTrigger value="donations">
                <Users className="h-4 w-4 mr-1.5" />
                Donations ({campaign.campaign_donations.length})
              </TabsTrigger>
            </TabsList>

            {/* Verification Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardContent className="p-4">
                  {campaign.verification_documents.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Verification documents uploaded by the campaign creator.
                      </p>
                      {campaign.verification_documents.map((doc) => {
                        const url = docUrls[doc.id];
                        const isDataUrl = url?.startsWith('data:');
                        const isImage = url
                          ? (isDataUrl ? url.includes('image/') : url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)/) !== null)
                          : false;

                        return (
                          <div key={doc.id} className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{doc.document_name || 'Verification Document'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Uploaded: {doc.uploaded_at ? formatDate(doc.uploaded_at) : 'Unknown'}
                                  </p>
                                </div>
                              </div>
                              {url ? (
                                <button
                                  onClick={() => openDocument(url, doc.document_name || 'Document')}
                                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  {isImage ? 'View Image' : 'View Document'}
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Loading...</span>
                              )}
                            </div>
                            {/* Inline image preview */}
                            {isImage && url && (
                              <div className="rounded-lg overflow-hidden border bg-muted p-2">
                                <img
                                  src={url}
                                  alt={doc.document_name || 'Document preview'}
                                  className="max-h-64 max-w-full mx-auto rounded cursor-pointer"
                                  onClick={() => openDocument(url, doc.document_name || 'Document')}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No verification documents uploaded</p>
                      <p className="text-xs text-muted-foreground mt-1">The creator has not provided supporting documents.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images">
              <Card>
                <CardContent className="p-4">
                  {campaign.campaign_images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {campaign.campaign_images.map((img) => (
                        <div key={img.id} className="rounded-lg overflow-hidden border aspect-video bg-muted">
                          <img
                            src={img.image_url}
                            alt={img.caption || 'Campaign image'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">${img.caption || 'Image unavailable'}</div>`;
                            }}
                          />
                          {img.caption && (
                            <p className="text-xs text-muted-foreground px-2 py-1 truncate">{img.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Image className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No additional images uploaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Donations Tab */}
            <TabsContent value="donations">
              <Card>
                <CardContent className="p-0">
                  {campaign.campaign_donations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="p-4 font-medium">Donor</th>
                            <th className="p-4 font-medium">Amount</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Message</th>
                            <th className="p-4 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {campaign.campaign_donations.map((don) => (
                            <tr key={don.id} className="hover:bg-muted/10">
                              <td className="p-4">
                                <p className="font-medium">{don.donor_name || 'Anonymous'}</p>
                                <p className="text-xs text-muted-foreground">{don.donor_email || ''}</p>
                              </td>
                              <td className="p-4 font-semibold">{formatCurrency(don.amount)}</td>
                              <td className="p-4">
                                <Badge
                                  variant={don.status === 'success' || don.status === 'paid' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {don.status || 'pending'}
                                </Badge>
                              </td>
                              <td className="p-4 text-muted-foreground max-w-[150px]">
                                <p className="truncate">{don.message || '—'}</p>
                              </td>
                              <td className="p-4 text-muted-foreground">
                                {don.created_at ? formatDate(don.created_at) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm">No donations yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Creator Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Campaign Creator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3 border-b pb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {campaign.creator_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Button variant="link" className="p-0 h-auto font-semibold text-foreground flex items-center gap-1.5" asChild>
                    <Link to={`/users/${campaign.creator_id}`}>
                      {campaign.creator_name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground mb-1">{campaign.creator_email}</p>
                  <div>
                    {campaign.creator_kyc_status === 'verified' ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" /> Verified Identity
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-gray-100 text-gray-500 border-gray-200">
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted: {campaign.created_at ? formatDateTime(campaign.created_at) : '—'}
              </p>
              {campaign.updated_at && campaign.updated_at !== campaign.created_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {formatDateTime(campaign.updated_at)}
                </p>
              )}
              {campaign.verified_at && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Approved: {formatDateTime(campaign.verified_at)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Funding Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Funding Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Raised</span>
                  <span className="font-bold text-green-600">{formatCurrency(raisedAmount)}</span>
                </div>
                {targetAmount > 0 && (
                  <>
                    <Progress value={progressPct} className="h-2 mb-1" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progressPct}% funded</span>
                      <span>of {formatCurrency(targetAmount)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Donations</span>
                  <span className="font-medium">{campaign.campaign_donations.length}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Successful</span>
                  <span className="font-medium text-green-600">
                    {campaign.campaign_donations.filter(d => d.status === 'success' || d.status === 'paid').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card className="border-2 border-dashed border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Admin Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Approve — only for pending */}
              {isPending && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'approve' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve Campaign
                </Button>
              )}

              {/* Reject — for pending */}
              {isPending && (
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={!!actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Campaign
                </Button>
              )}

              {/* Pause — for active */}
              {isActive && (
                <Button
                  variant="outline"
                  className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                  onClick={handlePause}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'pause' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PauseCircle className="h-4 w-4 mr-2" />
                  )}
                  Pause Campaign
                </Button>
              )}

              {/* Resume — for paused */}
              {isPaused && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleResume}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'resume' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Resume Campaign
                </Button>
              )}

              {/* Close — for active or paused */}
              {(isActive || isPaused) && (
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
                  onClick={() => setShowCloseDialog(true)}
                  disabled={!!actionLoading}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Close Campaign
                </Button>
              )}

              {/* Show current status if no actions available */}
              {(isRejected || isClosed) && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    This campaign is <strong>{status}</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">No further actions available.</p>
                </div>
              )}

              {/* Divider + Reject from active */}
              {isActive && (
                <>
                  <div className="border-t pt-2" />
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-500 hover:bg-red-50 text-sm"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={!!actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject (Deactivate)
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Verification Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Verification Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Creator is KYC verified', ok: campaign.creator_kyc_status === 'verified' },
                { label: 'Has summary', ok: !!campaign.summary },
                { label: 'Has story (who/why/achieve)', ok: !!(campaign.story_for || campaign.story_why || campaign.story_achieve) },
                { label: 'Has main image', ok: !!campaign.main_image_url },
                { label: 'Has verification docs', ok: campaign.verification_documents.length > 0 },
                { label: 'Has target / open-ended set', ok: !!campaign.target_amount || !!campaign.is_open_ended },
                { label: 'Has category', ok: !!campaign.category },
                { label: 'Has contact info', ok: !!campaign.phone_number },
                { label: 'Has social presence', ok: campaign.social_links?.length > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span className={item.ok ? 'text-emerald-500 font-bold' : 'text-gray-300'}>
                    {item.ok ? '✓' : '○'}
                  </span>
                  <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Campaign</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting <strong>"{campaign.title}"</strong>. This will be recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason *</Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain why this campaign is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading === 'reject'}
            >
              {actionLoading === 'reject' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to close <strong>"{campaign.title}"</strong>? This will stop any further donations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={actionLoading === 'close'}
            >
              {actionLoading === 'close' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Close Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog open={showDocViewer} onOpenChange={setShowDocViewer}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewingDocName || 'Document Preview'}</DialogTitle>
            <DialogDescription>
              Verification document submitted by the campaign creator.
            </DialogDescription>
          </DialogHeader>
          {viewingDocUrl && (
            <div className="flex justify-center items-center bg-muted/30 rounded-lg p-4 min-h-48">
              <img
                src={viewingDocUrl}
                alt={viewingDocName || 'Document'}
                className="max-h-[60vh] max-w-full rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocViewer(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FundraisingDetailPage;
