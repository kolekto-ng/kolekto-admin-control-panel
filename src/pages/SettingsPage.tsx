import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

// Critical fix #3 of the admin-panel remediation (2026-08-06): this page
// previously rendered a full settings form (platform name, notifications,
// 2FA, session timeout, and — most concerning — a "Paystack Secret Key"
// password field) whose Save button only showed a success toast. Nothing
// was ever read from or written to any backend or database; every value
// reset to its hardcoded default on reload. A backend audit (grepped
// routes/ and controllers/ in kolekto-be-old for any admin platform-settings
// endpoint) found none — only end-user account routes
// (routes/settings/{profile,kyc,security}.js), which are a different
// feature entirely.
//
// Per the remediation objective ("if the backend already has infrastructure
// for settings, wire it end-to-end; if not, disable the page rather than
// leaving fake persistence"): no such infrastructure exists, so this is
// disabled rather than built out as a net-new feature here. The route and
// nav entry are left in place (removing them is a separate, larger decision
// this fix doesn't make) — landing here now tells the truth instead of
// silently doing nothing.
const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage platform configuration and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Not yet available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Platform settings management has not been built yet — there is no
            backend endpoint or database table backing this page. No settings
            are saved by this screen. Changes you make elsewhere in the admin
            panel or in the main application are unaffected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
