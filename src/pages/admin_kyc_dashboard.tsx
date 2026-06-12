import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { useKYCStore, KYCStatus } from '@/stores/kycStore';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  reviewing: {
    label: 'Reviewing',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Eye,
  },
  verified: {
    label: 'Verified',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
};

const AdminKYCDashboard = () => {
  const { kycUsers, stats, loading, error, fetchKYCList } = useKYCStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const API_BASE_URL =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_API_URL || "https://api.kolekto.com.ng/api"
      : import.meta.env.VITE_API_BASE_URL || "http://localhost:5050/api";

  useEffect(() => {
    fetchKYCList();
  }, [fetchKYCList]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  }, [error, toast]);

  const filtered = kycUsers.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone_number || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || user.kyc_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Check className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600">
            Not Started
          </Badge>
        );
    }
  };

  const getRiskBadge = (score) => {
    if (score >= 80) {
      return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
    }
  };
  const handleVerificationAction = async ({ action, documentType = null, documentId = null, verificationType = null }) => {
    if (!selectedUser) return;

    setActionLoading(true);

    try {
      let response;
      const payload = {
        notes: adminNotes,
        ...(documentType && { documentType: documentType }),
        ...(verificationType && { verification_type: verificationType })
      };
      console.log(payload);

      switch (action) {
        case 'approve_document':
          if (documentId) {
            response = await axiosInstance.post(
              `${API_BASE_URL}/adminurlabdkole/kyc-documents/${documentId}/approve`,
              payload
            );
          } else {
            throw new Error('No document ID provided');
          }
          break;

        case 'reject_document':
          if (documentId) {
            response = await axiosInstance.post(
              `${API_BASE_URL}/adminurlabdkole/kyc-documents/${documentId}/reject`,
              payload
            );
          } else {
            throw new Error('No document ID provided');
          }
          break;

        case 'add_note':
          response = await axiosInstance.post(
            `${API_BASE_URL}/adminurlabdkole/kyc-verifications/${selectedUser.id}/add-note`,
            payload
          );
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      console.log('Action response:', response.data);

      if (response.data.message) {
        toast.success(`KYC ${action.replace('_', ' ')} successful!`);

        // Refresh user details
        await fetchUserDetails(selectedUser.id);

        // Refresh users list
        await fetchKYCVerifications();

        // Reset form
        setAdminNotes('');
        setShowDocumentModal(false);
      } else {
        toast.error(response.data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to perform action. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    setSelectedUserLoading(true);
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/adminurlabdkole/kyc-verifications/${userId}`
      );
      setSelectedUserDetails(response.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setSelectedUserLoading(false);
    }
  };

  const openDocumentModal = (document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  // Fetch full KYC details when selectedUser changes
  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserDetails(null);
      return;
    }
    fetchUserDetails(selectedUser.id);
  }, [selectedUser]);

  if (selectedUser && selectedUserLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading user details...</p>
      </div>
    );
  }

  if (!selectedUser && filteredUsers.length > 0) {
    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">KYC Verification Dashboard</h1>
            <p className="text-muted-foreground">Review and verify user submissions</p>
          </div>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users List */}
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.profile?.avatar_url} />
                      <AvatarFallback>
                        {user.profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{user.profile?.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.profile?.email}</p>
                      <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusBadge(user.status)}
                        {getRiskBadge(user.overallRiskScore || 75)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(user.profile?.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    <Button onClick={() => setSelectedUser(user)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const statCards = [
    {
      label: 'Total Submissions',
      value: stats.total,
      icon: ShieldCheck,
      iconClass: 'text-indigo-500',
      bgClass: 'bg-indigo-50',
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      icon: Clock,
      iconClass: 'text-amber-500',
      bgClass: 'bg-amber-50',
      highlight: stats.pending > 0,
    },
    {
      label: 'Verified',
      value: stats.verified,
      icon: CheckCircle,
      iconClass: 'text-emerald-500',
      bgClass: 'bg-emerald-50',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-500" />
            KYC Verification Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Review, approve, and manage user identity verifications.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchKYCList()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className={`border ${card.highlight ? 'border-amber-300 ring-1 ring-amber-200' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${card.bgClass} p-2 rounded-lg`}>
                  <card.icon className={`h-5 w-5 ${card.iconClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

          {/* Identity Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Identity Documents
                </span>
                {getStatusBadge(selectedUserDetails.identityVerification?.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedUserDetails.identityVerification?.documents?.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{doc.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'} • {doc.files?.length || 0} file(s)
                        {doc.files && doc.files.length > 0 && ` • ${(doc.files.reduce((acc, f) => acc + f.fileSize, 0) / (1024 * 1024)).toFixed(2)} MB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(doc.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDocumentModal(doc)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleVerificationAction({ action: 'reject_document', documentType: doc.type, documentId: doc.id, verificationType: 'identity' })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                      onClick={() => handleVerificationAction({ action: 'approve_document', documentType: doc.type, documentId: doc.id, verificationType: 'identity' })}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}

            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address Verification
                </span>
                {getStatusBadge(selectedUserDetails.addressVerification?.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedUserDetails.addressVerification?.documents?.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{doc.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'} • {doc.files?.length || 0} file(s)
                        {doc.files && doc.files.length > 0 && ` • ${(doc.files.reduce((acc, f) => acc + f.fileSize, 0) / (1024 * 1024)).toFixed(2)} MB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(doc.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDocumentModal(doc)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleVerificationAction({ action: 'reject_document', documentType: doc.type, documentId: doc.id, verificationType: 'address' })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                      onClick={() => handleVerificationAction({ action: 'approve_document', documentType: doc.type, documentId: doc.id, verificationType: 'address' })}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>


        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Modal */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document Review - {selectedDocument?.type}</DialogTitle>
            <DialogDescription>
              Review and verify the uploaded document
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              {selectedDocument.files && selectedDocument.files.length > 0 ? (
                <Tabs defaultValue="file-0" className="w-full">
                  <TabsList className="mb-4">
                    {selectedDocument.files.map((file, index) => (
                      <TabsTrigger key={`trigger-${index}`} value={`file-${index}`}>
                        {file.fileName?.toLowerCase().includes('selfie') ? 'Selfie' : 'ID Document'}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {selectedDocument.files.map((file, index) => (
                    <TabsContent key={`content-${index}`} value={`file-${index}`} className="space-y-4 mt-0">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{file.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            Uploaded: {new Date(file.uploadedAt).toLocaleString()} •
                            Size: {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => window.open(file.fileUrl, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Full Size
                        </Button>
                      </div>

                      <div className="border rounded-lg p-4 bg-white min-h-[300px] flex items-center justify-center">
                        {file.fileType?.includes('pdf') || file.fileName?.toLowerCase().endsWith('.pdf') ? (
                          <iframe
                            src={`${file.fileUrl}#toolbar=0`}
                            className="w-full h-[500px] rounded border-0"
                            title="PDF Document Preview"
                          />
                        ) : (
                          <img
                            src={file.fileUrl}
                            alt={selectedDocument.type}
                            className="w-full max-h-96 object-contain rounded"
                          />
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="p-4 border rounded-lg bg-gray-50 text-center text-muted-foreground">
                  No files found for this document.
                </div>
              )}

              <div className="space-y-2">
                <Label>Verification Notes</Label>
                <Textarea
                  placeholder="Add notes about this document..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}


          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setShowDocumentModal(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleVerificationAction({ 
                action: 'reject_document', 
                documentType: selectedDocument?.type, 
                documentId: selectedDocument?.id, 
                verificationType: selectedDocument?.documentType 
              })}
              disabled={actionLoading}
            >
              <X className="h-4 w-4 mr-2" />
              {actionLoading ? 'Processing...' : 'Reject Document'}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleVerificationAction({ 
                action: 'approve_document', 
                documentType: selectedDocument?.type, 
                documentId: selectedDocument?.id, 
                verificationType: selectedDocument?.documentType 
              })}
              disabled={actionLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              {actionLoading ? 'Processing...' : 'Approve Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKYCDashboard;