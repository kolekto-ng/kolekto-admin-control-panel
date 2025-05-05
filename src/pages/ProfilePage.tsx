
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { User, Mail, Phone } from 'lucide-react';

const ProfilePage = () => {
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('Admin User');
  const [email, setEmail] = useState('admin@kolekto.com');
  const [phoneNumber, setPhoneNumber] = useState('+234 800 123 4567');
  const { toast } = useToast();
  
  const handleSaveProfile = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    }, 1000);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          View and update your personal information
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Summary</CardTitle>
            <CardDescription>
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={fullName} />
                <AvatarFallback className="text-3xl bg-kolekto-orange text-white">
                  {fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="mt-4 font-semibold text-lg">{fullName}</h2>
              <p className="text-sm text-muted-foreground">Administrator</p>
              
              <div className="w-full mt-6 space-y-3">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{phoneNumber}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">Account type: Administrator</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      
        {/* Edit Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="profileImage">Profile Image</Label>
                <Input id="profileImage" type="file" />
                <p className="text-sm text-muted-foreground">
                  Recommended size: 256x256px. Max file size: 2MB.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline">Cancel</Button>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account Activities</CardTitle>
          <CardDescription>
            Recent activities on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Login</p>
                  <p className="text-sm text-muted-foreground">You logged in from Lagos, Nigeria</p>
                </div>
                <span className="text-sm text-muted-foreground">10 minutes ago</span>
              </div>
            </div>
            
            <div className="border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Withdrawal Approved</p>
                  <p className="text-sm text-muted-foreground">You approved a withdrawal request of ₦25,000</p>
                </div>
                <span className="text-sm text-muted-foreground">Yesterday</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Settings Updated</p>
                  <p className="text-sm text-muted-foreground">You changed your notification preferences</p>
                </div>
                <span className="text-sm text-muted-foreground">3 days ago</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
