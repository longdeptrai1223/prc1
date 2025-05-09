import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatDateTime } from "@/lib/mining";
import { useMining } from "@/hooks/use-mining";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsSection() {
  const { miningStats, isLoadingMiningStats } = useMining();
  
  // Fetch mining history
  const { 
    data: miningHistory,
    isLoading: isLoadingHistory
  } = useQuery({
    queryKey: ['/api/mining/history'],
    enabled: !!miningStats
  });
  
  if (isLoadingMiningStats || isLoadingHistory) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">Mining Stats</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="w-full">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        </div>
        
        <Card className="w-full">
          <CardContent className="p-5">
            <Skeleton className="h-6 w-32 mb-3" />
            
            {[1, 2, 3].map(i => (
              <div key={i} className="py-3 border-b border-gray-100">
                <div className="flex justify-between">
                  <div>
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    );
  }
  
  const totalMined = miningStats?.totalMined || 0;
  const startDate = miningStats?.createdAt 
    ? formatDate(miningStats.createdAt) 
    : formatDate(new Date());
  const currentRate = miningStats?.currentRate || 0.1;
  const referralCount = miningStats?.referralCount || 0;
  
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Mining Stats</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="w-full">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total Mined</p>
            <p className="text-xl font-bold text-gray-800">{totalMined.toFixed(1)} PTC</p>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Mining Since</p>
            <p className="text-xl font-bold text-gray-800">{startDate}</p>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Current Rate</p>
            <p className="text-xl font-bold text-primary">{currentRate.toFixed(2)} PTC/day</p>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total Referrals</p>
            <p className="text-xl font-bold text-gray-800">{referralCount}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="w-full">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">Mining History</h3>
          
          {miningHistory && miningHistory.length > 0 ? (
            miningHistory.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium">
                    {item.type === 'mining' ? 'Mining Reward' : 'Referral Bonus'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDateTime(item.timestamp)}
                  </p>
                </div>
                <p className="text-primary font-semibold">+{item.amount.toFixed(2)} PTC</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No mining history yet</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
