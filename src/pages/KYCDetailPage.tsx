import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Shield,
  Check,
  X,
  Eye,
  Download,
  ExternalLink,
  Clock,
  Loader2,
  MessageSquare,
  History,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { useKYCStore, REJECTION_REASONS, KYCDocument, KYCStatus } from '@/stores/kycStore';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  reviewing: { label: 'Reviewing', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  verified: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
};

const KYCDetailPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const {
    selectedUser,
    detailLoading,
    error,
    fetchKYCDetail,
    getSignedUrl,
    approveDocument,
    rejectDocument,
    approveNIN,
    rejectNIN,
    addFeedback,
  } = useKYCStore();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<KYCDocument | null>(null);
  const [activeTab, setActiveTab] = useState<'selfie' | 'document' | 'side-by-side'>('selfie');
  const [showNINRejectDialog, setShowNINRejectDialog] = useState(false);
  const [ninRejectReason, setNINRejectReason] = useState('');
  // Lazy signed URLs: fetched only when a document is opened for viewing
  const [fileUrlsLoading, setFileUrlsLoading] = useState(false);
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userId) fetchKYCDetail(userId);
  }, [userId, fetchKYCDetail]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  }, [error, toast]);

  const handleApprove = async (documentId: string) => {
    if (!userId) return;
    setActionLoading(`approve-${documentId}`);
    const result = await approveDocument(documentId, userId);
    setActionLoading(null);
    if (result.success) {
      toast({ title: '✅ Document Approved', description: 'The document has been verified.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleOpenRejectDialog = (documentId: string) => {
    setSelectedDocId(documentId);
    setRejectReason('');
    setCustomReason('');
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!userId || !selectedDocId) return;
    const reason = rejectReason === 'custom' ? customReason : rejectReason;
    if (!reason.trim()) return;

    setActionLoading(`reject-${selectedDocId}`);
    const result = await rejectDocument(selectedDocId, userId, reason);
    setActionLoading(null);
    setShowRejectDialog(false);
    if (result.success) {
      toast({ title: '❌ Document Rejected', description: 'Rejection feedback has been recorded.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to reject', variant: 'destructive' });
    }
  };

  const handleApproveNIN = async () => {
    if (!userId) return;
    setActionLoading('approve-nin');
    const result = await approveNIN(userId);
    setActionLoading(null);
    if (result.success) {
      toast({ title: '✅ NIN Approved', description: 'The NIN has been verified.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to approve NIN', variant: 'destructive' });
    }
  };

  const handleRejectNIN = async () => {
    if (!userId || !ninRejectReason.trim()) return;
    setActionLoading('reject-nin');
    const result = await rejectNIN(userId, ninRejectReason);
    setActionLoading(null);
    setShowNINRejectDialog(false);
    setNINRejectReason('');
    if (result.success) {
      toast({ title: '❌ NIN Rejected', description: 'The NIN has been rejected.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to reject NIN', variant: 'destructive' });
    }
  };

  const handleAddFeedback = async () => {
    if (!userId || !feedbackNote.trim() || !selectedUser?.verification) return;
    setActionLoading('feedback');
    const result = await addFeedback(userId, selectedUser.verification.id, feedbackNote);
    setActionLoading(null);
    setFeedbackNote('');
    if (result.success) {
      toast({ title: '📝 Feedback Saved', description: 'Your note has been recorded.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to save feedback', variant: 'destructive' });
    }
  };

  const openDocumentViewer = async (doc: KYCDocument) => {
    setViewingDoc(doc);
    if (doc.document_type === 'identity') {
      setActiveTab('selfie');
    } else {
      setActiveTab('document');
    }
    setShowDocumentModal(true);

    // Fetch signed URLs only for files that aren't already cached
    const uncachedFiles = doc.files.filter((f) => !urlCache[f.file_path]);
    if (uncachedFiles.length === 0) return;

    setFileUrlsLoading(true);
    const entries = await Promise.all(
      uncachedFiles.map(async (f) => {
        const url = await getSignedUrl(f.file_path);
        return [f.file_path, url] as [string, string];
      })
    );
    setUrlCache((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    setFileUrlsLoading(false);
  };

  const getStatusBadge = (status: string | null) => {
    const cfg = STATUS_CONFIG[status || 'pending'] || STATUS_CONFIG['pending'];
    return (
      <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
        {cfg.label}
      </Badge>
    );
  };

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading KYC details...</span>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">KYC record not found</h2>
        <p className="text-muted-foreground mt-1">This user may not have submitted KYC yet.</p>
        <Button asChild className="mt-4">
          <Link to="/kyc">Back to KYC List</Link>
        </Button>
      </div>
    );
  }

  const identityDocs = selectedUser.documents.filter((d) => d.document_type === 'identity');
  const addressDocs = selectedUser.documents.filter((d) => d.document_type === 'address');
  const verification = selectedUser.verification;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/kyc"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedUser.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">KYC Verification Review</span>
              {verification && getStatusBadge(verification.status)}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/users/${selectedUser.user_id}`}>
            <User className="h-4 w-4 mr-1.5" />
            View User Profile
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedUser.full_name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{selectedUser.full_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{selectedUser.phone_number || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date of Birth</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedUser.date_of_birth ? formatDate(selectedUser.date_of_birth) : 'Not provided'}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.address || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* NIN */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">National Identification Number (NIN)</Label>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono">
                      {selectedUser.nin_last4 ? `**** **** ***${selectedUser.nin_last4}` : 'Not submitted'}
                    </span>
                    {verification?.nin_verified ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" /> Verified
                      </Badge>
                    ) : selectedUser.nin_last4 ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                        Pending Review
                      </Badge>
                    ) : null}
                  </div>
                  {selectedUser.nin_last4 && !verification?.nin_verified && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        onClick={handleApproveNIN}
                        disabled={actionLoading === 'approve-nin'}
                      >
                        {actionLoading === 'approve-nin' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 border-red-300 text-red-600 hover:bg-red-50 text-xs"
                        onClick={() => setShowNINRejectDialog(true)}
                        disabled={actionLoading === 'reject-nin'}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {selectedUser.nin_last4 && verification?.nin_verified && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 border-red-200 text-red-500 hover:bg-red-50 text-xs"
                      onClick={() => setShowNINRejectDialog(true)}
                      disabled={actionLoading === 'reject-nin'}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">NIN is partially masked for security. Last 4 digits shown for verification.</p>
              </div>

              <div>
                <Label className="text-sm font-medium">User ID</Label>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{selectedUser.user_id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Identity Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Identity Documents
                </span>
                {verification && getStatusBadge(verification.identity_verified ? 'verified' : 'pending')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {identityDocs.length > 0 ? (
                identityDocs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    actionLoading={actionLoading}
                    onView={() => openDocumentViewer(doc)}
                    onApprove={() => handleApprove(doc.id)}
                    onReject={() => handleOpenRejectDialog(doc.id)}
                  />
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm">No identity documents submitted</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address Verification Documents
                </span>
                {verification && getStatusBadge(verification.address_verified ? 'verified' : 'pending')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addressDocs.length > 0 ? (
                addressDocs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    actionLoading={actionLoading}
                    onView={() => openDocumentViewer(doc)}
                    onApprove={() => handleApprove(doc.id)}
                    onReject={() => handleOpenRejectDialog(doc.id)}
                  />
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <MapPin className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm">No address verification documents submitted</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History Timeline */}
          {selectedUser.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <History className="h-5 w-5 mr-2" />
                  Verification History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedUser.history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-foreground">
                          {entry.change_reason || 'Status changed'}
                        </p>
                        {entry.old_status && entry.new_status && (
                          <p className="text-xs text-muted-foreground">
                            {entry.old_status} → {entry.new_status}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.changed_at ? formatDateTime(entry.changed_at) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Column ────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Verification Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Verification Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Identity document submitted', ok: identityDocs.length > 0 },
                { label: 'Identity verified', ok: verification?.identity_verified || false },
                { label: 'Address document submitted', ok: addressDocs.length > 0 },
                { label: 'Address verified', ok: verification?.address_verified || false },
                { label: 'NIN submitted', ok: !!selectedUser.nin_last4 },
                { label: 'NIN verified', ok: verification?.nin_verified || false },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span className={item.ok ? 'text-emerald-500' : 'text-gray-300'}>
                    {item.ok ? '✓' : '○'}
                  </span>
                  <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Overall Status */}
          <Card className="border-2 border-dashed border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Overall KYC Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-3">
                {verification?.status === 'verified' ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                    <p className="font-semibold text-emerald-700">Fully Verified</p>
                    {verification.completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Completed {formatDateTime(verification.completed_at)}
                      </p>
                    )}
                  </div>
                ) : verification?.status === 'rejected' ? (
                  <div className="space-y-2">
                    <XCircle className="h-10 w-10 text-red-500 mx-auto" />
                    <p className="font-semibold text-red-700">Rejected</p>
                    <p className="text-xs text-muted-foreground">
                      One or more documents were rejected
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Clock className="h-10 w-10 text-amber-500 mx-auto" />
                    <p className="font-semibold text-amber-700">Pending Review</p>
                    <p className="text-xs text-muted-foreground">
                      Awaiting admin verification
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Feedback */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Admin Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add a note or feedback for this user's KYC..."
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                rows={4}
              />
              <Button
                className="w-full"
                onClick={handleAddFeedback}
                disabled={!feedbackNote.trim() || actionLoading === 'feedback'}
              >
                {actionLoading === 'feedback' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Feedback
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Reject Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reject Document
            </DialogTitle>
            <DialogDescription>
              Select a reason for rejection. This feedback will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom reason...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rejectReason === 'custom' && (
              <div>
                <Label htmlFor="custom-reason">Custom Reason</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Explain why this document is being rejected..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={
                (!rejectReason || (rejectReason === 'custom' && !customReason.trim())) ||
                actionLoading?.startsWith('reject')
              }
            >
              {actionLoading?.startsWith('reject') ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Document Viewer Dialog ─────────────────────────────────────────── */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Document Review — {viewingDoc?.verification_type || viewingDoc?.document_type}
            </DialogTitle>
            <DialogDescription>
              Review the uploaded document. You can view it at full size or download it.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            if (!viewingDoc) return null;

            const isIdentity = viewingDoc.document_type === 'identity';
            const selfieFiles = viewingDoc.files.filter(f => f.file_name.toLowerCase().includes('selfie'));
            const documentFiles = viewingDoc.files.filter(f => !f.file_name.toLowerCase().includes('selfie'));
            const hasSelfieAndDoc = selfieFiles.length > 0 && documentFiles.length > 0;

            const renderFileItem = (file: KYCFile) => {
              const signedUrl = urlCache[file.file_path];
              return (
                <div key={file.id} className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-gray-100 shadow-sm">
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="font-medium text-sm truncate" title={file.file_name}>{file.file_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {file.uploaded_at ? formatDateTime(file.uploaded_at) : ''} •{' '}
                        {file.file_size ? `${(file.file_size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size'}
                      </p>
                    </div>
                    {signedUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(signedUrl, '_blank')}
                        className="flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Open Full Size
                      </Button>
                    )}
                  </div>
                  {signedUrl && (
                    <div className="border rounded-lg p-2 bg-gray-50/50 flex justify-center items-center">
                      <img
                        src={signedUrl}
                        alt={file.file_name}
                        className="w-full max-h-[50vh] object-contain rounded shadow-sm hover:scale-[1.01] transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            };

            if (viewingDoc.files.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p>No files attached to this document</p>
                </div>
              );
            }

            if (fileUrlsLoading) {
              return (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                  <p className="text-sm">Loading document files...</p>
                </div>
              );
            }

            return (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {isIdentity && hasSelfieAndDoc && (
                  <div className="flex border-b border-gray-200 bg-gray-50/50 p-1 rounded-lg sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                    <button
                      type="button"
                      onClick={() => setActiveTab('selfie')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                        activeTab === 'selfie'
                          ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                    >
                      <User className="h-4 w-4" />
                      Selfie Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('document')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                        activeTab === 'document'
                          ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      ID Document
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('side-by-side')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                        activeTab === 'side-by-side'
                          ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                    >
                      <Eye className="h-4 w-4" />
                      Side-by-Side View
                    </button>
                  </div>
                )}

                {isIdentity && hasSelfieAndDoc ? (
                  <>
                    {activeTab === 'selfie' && (
                      <div className="space-y-4">
                        {selfieFiles.map(renderFileItem)}
                      </div>
                    )}

                    {activeTab === 'document' && (
                      <div className="space-y-4">
                        {documentFiles.map(renderFileItem)}
                      </div>
                    )}

                    {activeTab === 'side-by-side' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg text-indigo-700 text-sm font-semibold sticky top-0 z-10 backdrop-blur-sm">
                            <User className="h-4 w-4" />
                            Selfie Photo
                          </div>
                          <div className="space-y-4">
                            {selfieFiles.map(renderFileItem)}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg text-emerald-700 text-sm font-semibold sticky top-0 z-10 backdrop-blur-sm">
                            <FileText className="h-4 w-4" />
                            Government-Issued ID
                          </div>
                          <div className="space-y-4">
                            {documentFiles.map(renderFileItem)}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    {viewingDoc.files.map(renderFileItem)}
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setShowDocumentModal(false)}>
              Close
            </Button>
            {viewingDoc && viewingDoc.status !== 'verified' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDocumentModal(false);
                    handleOpenRejectDialog(viewingDoc.id);
                  }}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    setShowDocumentModal(false);
                    handleApprove(viewingDoc.id);
                  }}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NIN Reject Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showNINRejectDialog} onOpenChange={setShowNINRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reject NIN
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this user's NIN. They will need to resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nin-reject-reason">Rejection Reason *</Label>
            <Textarea
              id="nin-reject-reason"
              placeholder="e.g. NIN last digits do not match submitted documents..."
              value={ninRejectReason}
              onChange={(e) => setNINRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNINRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectNIN}
              disabled={!ninRejectReason.trim() || actionLoading === 'reject-nin'}
            >
              {actionLoading === 'reject-nin' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Document Row Component ─────────────────────────────────────────────────

interface DocumentRowProps {
  doc: KYCDocument;
  actionLoading: string | null;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}

const DocumentRow = ({ doc, actionLoading, onView, onApprove, onReject }: DocumentRowProps) => {
  const statusCfg = STATUS_CONFIG[doc.status || 'pending'] || STATUS_CONFIG['pending'];

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 p-2 rounded">
          <FileText className="h-4 w-4 text-indigo-600" />
        </div>
        <div>
          <p className="font-medium text-sm">{doc.verification_type || doc.document_type}</p>
          <p className="text-xs text-muted-foreground">
            {doc.uploaded_at ? formatDate(doc.uploaded_at) : 'Unknown date'} •{' '}
            {doc.files.length} file{doc.files.length !== 1 ? 's' : ''}
          </p>
          {doc.rejection_reason && (
            <p className="text-xs text-red-600 mt-0.5">
              Reason: {doc.rejection_reason}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
          {statusCfg.label}
        </Badge>
        <Button variant="outline" size="sm" onClick={onView}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        {doc.status !== 'verified' && (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={onReject}
              disabled={actionLoading === `reject-${doc.id}`}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
              onClick={onApprove}
              disabled={actionLoading === `approve-${doc.id}`}
            >
              {actionLoading === `approve-${doc.id}` ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Approve
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default KYCDetailPage;
