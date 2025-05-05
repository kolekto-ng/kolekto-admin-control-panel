
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Check } from 'lucide-react';

const SettingsPage = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [withdrawalNotifications, setWithdrawalNotifications] = useState(true);
  const [systemEmail, setSystemEmail] = useState('admin@kolekto.com');
  const [supportEmail, setSupportEmail] = useState('support@kolekto.com');

  const handleSystemSettingsSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Settings saved",
        description: "Your system settings have been updated",
      });
    }, 1000);
  };

  const handleNotificationSettingsSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Notification settings saved",
        description: "Your notification preferences have been updated",
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and platform preferences.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemEmail">System Email</Label>
                <Input 
                  id="systemEmail" 
                  value={systemEmail} 
                  onChange={(e) => setSystemEmail(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  This email is used for system notifications and alerts.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input 
                  id="supportEmail" 
                  value={supportEmail} 
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  User inquiries and support requests will be directed to this email.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable maintenance mode to prevent users from accessing the platform.
                  </p>
                </div>
                <Switch />
              </div>
              
              <Button 
                onClick={handleSystemSettingsSave} 
                disabled={saving}
                className="mt-2"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>Save Settings</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Information</CardTitle>
              <CardDescription>
                Current platform statistics and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Admin Panel Version</p>
                  <p className="text-sm text-muted-foreground">v1.0.0</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">May 5, 2025</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Backend Status</p>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-status-success mr-1" />
                    <p className="text-sm text-status-success">Connected</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Database Status</p>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-status-success mr-1" />
                    <p className="text-sm text-status-success">Online</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications from the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch 
                  checked={emailNotifications} 
                  onCheckedChange={setEmailNotifications} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive system-level alerts and notifications
                  </p>
                </div>
                <Switch 
                  checked={systemNotifications} 
                  onCheckedChange={setSystemNotifications} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Withdrawal Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new withdrawal requests are submitted
                  </p>
                </div>
                <Switch 
                  checked={withdrawalNotifications} 
                  onCheckedChange={setWithdrawalNotifications} 
                />
              </div>
              
              <Button 
                onClick={handleNotificationSettingsSave} 
                disabled={saving}
                className="mt-2"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>Save Preferences</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password Settings</CardTitle>
              <CardDescription>
                Update your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              
              <Button className="mt-2">
                Update Password
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Protect your account with two-factor authentication
                  </p>
                </div>
                <Switch />
              </div>
              
              <Button variant="outline" className="mt-2">
                Set Up 2FA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
