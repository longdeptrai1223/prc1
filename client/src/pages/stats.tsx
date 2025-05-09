import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMining } from "@/hooks/use-mining";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatDateTime } from "@/lib/mining";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { BarChart2, TrendingUp, Clock, CalendarDays } from "lucide-react";

export default function Stats() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const { miningStats, isLoadingMiningStats } = useMining();
  
  // Fetch mining history
  const { 
    data: miningHistory,
    isLoading: isLoadingHistory
  } = useQuery({
    queryKey: ['/api/mining/history'],
    enabled: !!user
  });
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading || isLoadingMiningStats || isLoadingHistory) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const totalMined = miningStats?.totalMined || 0;
  const startDate = miningStats?.createdAt 
    ? formatDate(miningStats.createdAt) 
    : formatDate(new Date());
  const currentRate = miningStats?.currentRate || 0.1;
  const referralCount = miningStats?.referralCount || 0;
  
  // Prepare chart data (would be more comprehensive in real app)
  const calculateDailyData = () => {
    // In a real app, this would use actual historical data
    // For now, we'll generate mock data based on current values
    const days = 7;
    return Array(days).fill(0).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: formatDate(date),
        amount: ((totalMined / days) * (0.8 + Math.random() * 0.4)).toFixed(2),
      };
    });
  };

  const dailyData = calculateDailyData();
  
  return (
    <main className="flex-grow pb-16">
      <div className="max-w-lg mx-auto px-4 py-5">
        <h1 className="text-2xl font-bold mb-4">Mining Statistics</h1>
        
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
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Mining Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.split(' ')[0]}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value} PTC`, 'Mined']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={{ fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="h-5 w-5 mr-2 text-primary" />
              Mining by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Mining', value: totalMined * 0.85 },
                    { name: 'Referrals', value: totalMined * 0.15 },
                  ]}
                  margin={{ top: 5, right: 5, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(2)} PTC`, 'Earned']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              Mining History
            </CardTitle>
          </CardHeader>
          <CardContent>
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
              <div className="text-center py-6 text-gray-500">
                <CalendarDays className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No mining history yet</p>
                <p className="text-sm mt-1">Start mining to see your history</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
