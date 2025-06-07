
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  Mail, 
  Smartphone,
  Globe,
  Database
} from 'lucide-react';

const SettingsPage = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    // Platform Settings
    platformName: 'Kolekto',
    supportEmail: 'support@kolekto.com',
    maintenanceMode: false,
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    
    // Payment Settings
    paystackPublicKey: '',
    paystackSecretKey: '',
    transactionFee: 2.5,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your settings have been successfully updated.',
    });
  };

  const handleTestPayment = () => {
    toast({
      title: 'Payment Test',
      description: 'Testing payment configuration...',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage platform configuration and preferences.
          </p>
        </div>
        <Button onClick={handleSave} className="bg-kolekto-orange hover:bg-kolekto-orange/90">
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Platform Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => handleSettingChange('platformName', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable public access
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label>Email Notifications</Label>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label>SMS Notifications</Label>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <Label>Push Notifications</Label>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Require 2FA for admin accounts
                </p>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => handleSettingChange('twoFactorAuth', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paystackPublicKey">Paystack Public Key</Label>
              <Input
                id="paystackPublicKey"
                type="password"
                placeholder="pk_test_..."
                value={settings.paystackPublicKey}
                onChange={(e) => handleSettingChange('paystackPublicKey', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paystackSecretKey">Paystack Secret Key</Label>
              <Input
                id="paystackSecretKey"
                type="password"
                placeholder="sk_test_..."
                value={settings.paystackSecretKey}
                onChange={(e) => handleSettingChange('paystackSecretKey', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transactionFee">Transaction Fee (%)</Label>
              <Input
                id="transactionFee"
                type="number"
                step="0.1"
                value={settings.transactionFee}
                onChange={(e) => handleSettingChange('transactionFee', parseFloat(e.target.value))}
              />
            </div>
            
            <Button variant="outline" onClick={handleTestPayment} className="w-full">
              Test Payment Configuration
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Database</div>
                <div className="text-sm text-muted-foreground">Supabase Connection</div>
              </div>
              <Badge variant="outline" className="bg-status-success/15 text-status-success">
                Connected
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Payment Gateway</div>
                <div className="text-sm text-muted-foreground">Paystack</div>
              </div>
              <Badge variant="outline" className="bg-status-pending/15 text-status-pending">
                Not Configured
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Email Service</div>
                <div className="text-sm text-muted-foreground">SMTP</div>
              </div>
              <Badge variant="outline" className="bg-status-pending/15 text-status-pending">
                Not Configured
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
