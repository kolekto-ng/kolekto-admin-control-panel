import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Check,
  X,
  Clock,
  Eye,
  AlertTriangle,
  User,
  FileText,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Building,
  Download,
  ExternalLink,
  MessageSquare,
  History,
  Search,
  Filter
} from 'lucide-react';
import { axiosInstance } from '@/lib/axios';

const AdminKYCDashboard = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [verificationAction, setVerificationAction] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
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
    fetchKYCVerifications();
  }, []);

  const fetchKYCVerifications = () => {
    setLoading(true);
    axiosInstance.get(`/adminurlabdkole/kyc-verifications`)
      .then(res => {
        console.log(res.data);
        setUsers(res.data.kycs || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching KYC verifications:', error);
        setLoading(false);
      });
  };

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const profile = user.profile || {};
    const matchesSearch =
      (profile.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

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
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No users found matching your criteria.</p>
      </div>
    );
  }

  if (!selectedUserDetails) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading user details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => setSelectedUser(null)}>
            ← Back to List
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{selectedUserDetails?.personalInfo?.full_name}</h1>
            <p className="text-muted-foreground">KYC Verification Review</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(selectedUserDetails?.kycStatus)}
          {getRiskBadge(selectedUserDetails?.overallRiskScore || 75)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Info & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUserDetails.personalInfo?.avatar_url} />
                  <AvatarFallback>
                    {selectedUserDetails.personalInfo?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{selectedUserDetails.personalInfo?.fullName}</h3>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selectedUserDetails.personalInfo?.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{selectedUserDetails.personalInfo?.phone}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date of Birth</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedUserDetails.personalInfo?.dateOfBirth
                        ? new Date(selectedUserDetails.personalInfo.dateOfBirth).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">User ID</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedUserDetails.id}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Address</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedUserDetails.personalInfo?.address || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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

        {/* Right Column - Sidebar Info */}
        <div className="space-y-6">

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add notes about this verification..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
              <Button
                className="w-full"
                onClick={() => handleVerificationAction({ action: 'add_note', verificationType: 'identity' })}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save Note'}
              </Button>
            </CardContent>
          </Card>
        </div>
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