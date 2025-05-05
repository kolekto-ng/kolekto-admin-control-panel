
import { Skeleton } from "@/components/ui/skeleton";

export const StatsSkeleton = () => {
  // Create an array of 7 items to match the number of stat cards
  return (
    <>
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="stats-card flex flex-col p-6 space-y-2">
          <div className="flex justify-between items-start">
            <div className="flex flex-col space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          
          <div className="flex justify-between items-end">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      ))}
    </>
  );
};
