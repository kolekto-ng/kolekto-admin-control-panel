import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

// Mock data for demonstration


const mockUsers = [
  {
    id: 'user_001',
    personalInfo: {
      fullName: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+234 123 456 7890',
      dateOfBirth: '1990-05-15',
      address: '123 Victoria Island, Lagos, Nigeria',
      profilePicture: '/api/placeholder/150/150',
      createdAt: '2024-01-15T10:30:00Z'
    },
    kycStatus: 'pending',
    overallRiskScore: 75,
    bvnVerification: {
      status: 'verified',
      bvn: '12345678901',
      bvnData: {
        first_name: 'John',
        last_name: 'Doe',
        mobile: '+234 123 456 7890',
        date_of_birth: '1990-05-15'
      },
      matchScore: 95,
      verifiedAt: '2024-01-18T14:22:00Z',
      hasDiscrepancies: false,
      discrepancies: []
    },
    identityVerification: {
      status: 'pending',
      documents: [
        {
          type: 'National ID',
          status: 'pending',
          uploadedAt: '2024-01-17T09:15:00Z',
          fileUrl: '/api/placeholder/400/300',
          fileSize: 2048000,
          fileName: 'national_id_front.jpg'
        },
        {
          type: 'Passport Photo',
          status: 'pending',
          uploadedAt: '2024-01-17T09:20:00Z',
          fileUrl: '/api/placeholder/300/400',
          fileSize: 1536000,
          fileName: 'passport_photo.jpg'
        }
      ]
    },
    addressVerification: {
      status: 'pending',
      documents: [
        {
          type: 'Utility Bill',
          status: 'pending',
          uploadedAt: '2024-01-17T11:30:00Z',
          fileUrl: '/api/placeholder/400/600',
          fileSize: 3072000,
          fileName: 'utility_bill_jan2024.pdf'
        }
      ]
    },
    bankVerification: {
      bankName: 'First Bank of Nigeria',
      accountNumber: '1234567890',
      accountName: 'John Doe',
      bvn: '12345678901',
      status: 'verified',
      verifiedAt: '2024-01-16T16:45:00Z'
    },
    securityData: {
      lastLogin: '2024-01-20T08:30:00Z',
      loginAttempts: [
        {
          timestamp: '2024-01-20T08:30:00Z',
          location: 'Lagos, Nigeria',
          device: 'Chrome on Windows',
          ipAddress: '197.149.128.45',
          status: 'successful'
        },
        {
          timestamp: '2024-01-19T14:15:00Z',
          location: 'Lagos, Nigeria',
          device: 'Safari on iPhone',
          ipAddress: '197.149.128.45',
          status: 'successful'
        }
      ]
    },
    verificationHistory: [
      {
        action: 'BVN Verified',
        timestamp: '2024-01-18T14:22:00Z',
        adminId: 'admin_001',
        adminName: 'Sarah Wilson',
        notes: 'BVN verification successful with 95% match score'
      },
      {
        action: 'Documents Uploaded',
        timestamp: '2024-01-17T09:15:00Z',
        adminId: null,
        adminName: 'System',
        notes: 'User uploaded National ID and Passport Photo'
      }
    ]
  }
];

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

  const API_BASE_URL =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_API_URL || "https://api.kolekto.com.ng/api"
      : import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/adminurlabdkole/kyc-verifications`)
      .then(res => res.json())
      .then(data => {
        setUsers(data.kycs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  const handleVerificationAction = (action, documentType = null) => {
    setVerificationAction(action);
    // In a real app, this would make an API call to update the verification status
    console.log(`Action: ${action}, Document: ${documentType}, Notes: ${adminNotes}`);

    // Reset form
    setAdminNotes('');

    // Close modals
    setShowDocumentModal(false);

    // Refresh user data (in real app, refetch from API)
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
    console.log(selectedUser, 'user');

    setSelectedUserLoading(true);
    fetch(`${API_BASE_URL}/adminurlabdkole/kyc-verifications/${selectedUser.id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedUserDetails(data);
        setSelectedUserLoading(false);
      })
      .catch(() => setSelectedUserLoading(false));
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
                      <AvatarImage src={user.profile.avatar_url} />
                      <AvatarFallback>
                        {user.profile.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{user.profile.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.profile.email}</p>
                      <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusBadge(user.kycStatus)}
                        {getRiskBadge(user.overallRiskScore)}
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
        <p className="text-muted-foreground">No users found matching your criteria.</p>
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
            <h1 className="text-2xl font-bold">{selectedUserDetails?.personalInfo?.fullName}</h1>
            <p className="text-muted-foreground">KYC Verification Review</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(selectedUserDetails?.kycStatus)}
          {getRiskBadge(selectedUserDetails?.overallRiskScore)}
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
                    {selectedUserDetails.personalInfo?.fullName.split(' ').map(n => n[0]).join('')}
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
                    <span className="text-sm">{new Date(selectedUserDetails.personalInfo?.dateOfBirth).toLocaleDateString()}</span>
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
                  <span className="text-sm">{selectedUserDetails.personalInfo?.address}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BVN Verification */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  BVN Verification
                </span>
                {getStatusBadge(selectedUser.bvnVerification.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">BVN</Label>
                  <p className="text-sm font-mono">{selectedUser.bvnVerification.bvn}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Match Score</Label>
                  <p className="text-sm font-semibold text-green-600">{selectedUser.bvnVerification.matchScore}%</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-medium text-green-800 text-sm mb-2">BVN Data Retrieved:</h4>
                <div className="text-xs text-green-600 space-y-1">
                  <p>• Name: {selectedUser.bvnVerification.bvnData.first_name} {selectedUser.bvnVerification.bvnData.last_name}</p>
                  <p>• Phone: {selectedUser.bvnVerification.bvnData.mobile}</p>
                  <p>• DOB: {selectedUser.bvnVerification.bvnData.date_of_birth}</p>
                  <p>• Verified: {new Date(selectedUser.bvnVerification.verifiedAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Identity Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Identity Documents
                </span>
                {getStatusBadge(selectedUserDetails.identityVerification.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedUserDetails.identityVerification.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{doc.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleDateString()} • {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
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
                  </div>
                </div>
              ))}

              <div className="flex space-x-2 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleVerificationAction('approve_identity')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve All
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleVerificationAction('reject_identity')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Address Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address Verification
                </span>
                {getStatusBadge(selectedUserDetails.addressVerification.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedUserDetails.addressVerification.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{doc.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleDateString()} • {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
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
                  </div>
                </div>
              ))}

              <div className="flex space-x-2 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleVerificationAction('approve_address')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve All
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleVerificationAction('reject_address')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleVerificationAction('approve_all')}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve All KYC
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handleVerificationAction('reject_all')}
              >
                <X className="h-4 w-4 mr-2" />
                Reject All KYC
              </Button>
              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Request More Info
              </Button>
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </CardContent>
          </Card>

          {/* Bank Verification */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Bank Account
                </span>
                {getStatusBadge(selectedUser.bankVerification.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Bank</Label>
                <p className="text-sm">{selectedUser.bankVerification.bankName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Account Number</Label>
                <p className="text-sm font-mono">{selectedUser.bankVerification.accountNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Account Name</Label>
                <p className="text-sm">{selectedUser.bankVerification.accountName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Verified</Label>
                <p className="text-sm text-green-600">{new Date(selectedUser.bankVerification.verifiedAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card> */}

          {/* Security Info */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Last Login</Label>
                <p className="text-sm">{new Date(selectedUser.securityData.lastLogin).toLocaleString()}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Recent Activity</Label>
                <div className="space-y-2 mt-2">
                  {selectedUser.securityData.loginAttempts.slice(0, 3).map((attempt, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                      <p className="font-medium">{attempt.location}</p>
                      <p className="text-muted-foreground">{new Date(attempt.timestamp).toLocaleString()}</p>
                      <p className="text-muted-foreground">{attempt.device}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Verification History */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Verification History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedUser.verificationHistory.map((item, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                  <p className="font-medium">{item.action}</p>
                  <p className="text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</p>
                  <p className="text-muted-foreground">By: {item.adminName}</p>
                  {item.notes && <p className="text-gray-600 mt-1">{item.notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card> */}

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
              <Button className="w-full" onClick={() => handleVerificationAction('add_note')}>
                Save Note
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
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{selectedDocument.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    Uploaded: {new Date(selectedDocument.uploadedAt).toLocaleString()} •
                    Size: {(selectedDocument.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button variant="outline" onClick={() => window.open(selectedDocument.fileUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Full Size
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <img
                  src={selectedDocument.fileUrl}
                  alt={selectedDocument.type}
                  className="w-full max-h-96 object-contain rounded"
                />
              </div>

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
              onClick={() => handleVerificationAction('reject_document', selectedDocument?.type)}
            >
              <X className="h-4 w-4 mr-2" />
              Reject Document
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleVerificationAction('approve_document', selectedDocument?.type)}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKYCDashboard;