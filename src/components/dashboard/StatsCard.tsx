
import { cn } from '@/lib/utils';
import { 
  Users, 
  Folders, 
  Coins, 
  Wallet, 
  Check, 
  Clock, 
  AlertCircle,
  Heart,
  Shield
} from 'lucide-react';

type IconName = 'users' | 'folders' | 'coins' | 'wallet' | 'check' | 'clock' | 'alert-circle' | 'heart' | 'shield';
type TrendDirection = 'up' | 'down' | 'stable';
type Variant = 'default' | 'success' | 'warning' | 'danger';

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon: IconName;
  trend?: TrendDirection;
  trendValue?: string;
  variant?: Variant;
  notification?: boolean;
}

export const StatsCard = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  trendValue,
  variant = 'default',
  notification = false,
}: StatsCardProps) => {
  const getIcon = () => {
    switch (icon) {
      case 'users': return <Users className="h-5 w-5" />;
      case 'folders': return <Folders className="h-5 w-5" />;
      case 'coins': return <Coins className="h-5 w-5" />;
      case 'wallet': return <Wallet className="h-5 w-5" />;
      case 'check': return <Check className="h-5 w-5" />;
      case 'clock': return <Clock className="h-5 w-5" />;
      case 'alert-circle': return <AlertCircle className="h-5 w-5" />;
      case 'heart': return <Heart className="h-5 w-5" />;
      case 'shield': return <Shield className="h-5 w-5" />;
    }
  };

  const getIconBackground = () => {
    switch (variant) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      case 'danger': return 'bg-red-100 text-red-700';
      default: return 'bg-primary/10 text-primary';
    }
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  return (
    <div className={cn(
      "stats-card flex flex-col p-6 space-y-2",
      notification && "border-l-4",
      notification && variant === 'warning' && "border-l-amber-500",
      notification && variant === 'danger' && "border-l-red-500",
      notification && variant === 'success' && "border-l-green-500",
      notification && variant === 'default' && "border-l-primary",
    )}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col space-y-1.5">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <div className={cn("p-2 rounded-full", getIconBackground())}>
          {getIcon()}
        </div>
      </div>
      
      <div className="flex justify-between items-end">
        <span className="text-xs text-muted-foreground">{description}</span>
        {trend && (
          <div className={cn("text-xs font-medium flex items-center gap-0.5", getTrendColor())}>
            <span>{getTrendIcon()}</span> {trendValue}
          </div>
        )}
      </div>
    </div>
  );
};
