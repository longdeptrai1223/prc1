import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMining } from "@/hooks/use-mining";
import { formatTime } from "@/lib/mining";
import { CloudLightning } from "lucide-react";

export default function MiningSection() {
  const { 
    miningStats, 
    isLoadingMiningStats,
    timeRemaining,
    miningProgress,
    startMining,
    isStartingMining,
    claimMining,
    isClaimingMining
  } = useMining();
  
  const handleMiningAction = () => {
    if (!miningStats) return;
    
    if (miningStats.miningActive) {
      claimMining();
    } else {
      startMining();
    }
  };
  
  if (isLoadingMiningStats) {
    return (
      <section className="mb-8">
        <Card className="w-full">
          <CardContent className="p-5 relative overflow-hidden">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="flex justify-between mb-5">
                <div className="w-1/3">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
                  <div className="h-6 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="w-1/3">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
                  <div className="h-6 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded-full mb-5"></div>
              <div className="flex justify-center">
                <div className="h-12 bg-gray-200 rounded-full w-1/2"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }
  
  const isMiningActive = miningStats?.miningActive || false;
  const miningButtonText = isMiningActive ? "Mining Active" : "Start Mining";
  const miningRate = miningStats?.currentRate || 0.1;
  
  return (
    <section className="mb-8">
      <Card className="w-full">
        <CardContent className="p-5 relative overflow-hidden">
          {isMiningActive && (
            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
              Active
            </div>
          )}
          
          <h2 className="text-xl font-semibold mb-4">PTC Mining</h2>
          
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-gray-600 mb-1">Mining Rate</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-primary">{miningRate.toFixed(1)}</span>
                <span className="ml-1 text-gray-600">PTC / 24h</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
              <div className="text-2xl font-bold text-gray-800">{timeRemaining}</div>
            </div>
          </div>
          
          <Progress value={miningProgress} className="h-3 mb-5" />
          
          <div className="flex justify-center">
            <Button 
              className={`px-8 py-4 h-auto rounded-full shadow-md transition flex items-center justify-center ${isMiningActive ? 'bg-green-500 hover:bg-green-600 pulse-animation' : 'bg-primary hover:bg-primary/90'}`}
              onClick={handleMiningAction}
              disabled={isStartingMining || isClaimingMining}
            >
              <CloudLightning className="h-5 w-5 mr-2" />
              <span>
                {isStartingMining 
                  ? "Starting..." 
                  : isClaimingMining 
                    ? "Claiming..." 
                    : miningButtonText}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
