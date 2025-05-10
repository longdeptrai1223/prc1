import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBackgroundMining } from "@/hooks/use-background-mining";
import { CloudLightning, WifiOff, Zap, Award, Loader2 } from "lucide-react";
import { formatTime } from "@/lib/mining";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

export default function MiningSection() {
  const {
    isLoading,
    offlineMode,
    miningStatus,
    canClaimReward,
    startMining,
    claimReward,
    isMiningStarting,
    isClaimingReward
  } = useBackgroundMining();
  
  const [animation, setAnimation] = useState(false);

  // Animation effect when mining
  useEffect(() => {
    if (miningStatus.miningActive && !miningStatus.miningCompleted) {
      setAnimation(true);
    } else {
      setAnimation(false);
    }
  }, [miningStatus.miningActive, miningStatus.miningCompleted]);

  const handleAction = () => {
    if (miningStatus.miningCompleted || canClaimReward) {
      claimReward();
    } else if (!miningStatus.miningActive) {
      startMining();
    }
  };

  // Loading state
  if (isLoading) {
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

  // Button text based on mining state
  let buttonText = "Start Mining";
  let buttonIcon = <CloudLightning className="h-5 w-5 mr-2" />;
  let buttonClass = "bg-primary hover:bg-primary/90";

  if (isMiningStarting) {
    buttonText = "Starting...";
  } else if (isClaimingReward) {
    buttonText = "Claiming...";
  } else if (miningStatus.miningCompleted || canClaimReward) {
    buttonText = "Claim Reward";
    buttonIcon = <Award className="h-5 w-5 mr-2" />;
    buttonClass = "bg-yellow-500 hover:bg-yellow-600";
  } else if (miningStatus.miningActive) {
    buttonText = "Mining in Progress";
    buttonIcon = <Loader2 className="h-5 w-5 mr-2 animate-spin" />;
    buttonClass = "bg-green-500 hover:bg-green-600";
  }

  // Calculate mining rate (mock value for demonstration)
  const miningRate = 0.15;

  return (
    <section className="mb-8">
      <Card className="w-full">
        <CardContent className="p-5 relative overflow-hidden">
          {/* Status badges */}
          <div className="absolute top-0 right-0 flex">
            {offlineMode && (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center mr-2">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            
            {miningStatus.miningActive && !miningStatus.miningCompleted && (
              <Badge className="bg-green-500 text-white">
                Mining
              </Badge>
            )}
            
            {miningStatus.miningCompleted && (
              <Badge className="bg-yellow-500 text-white">
                Completed
              </Badge>
            )}
          </div>
          
          <h2 className="text-xl font-semibold mb-4">PTC Mining</h2>
          
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-gray-600 mb-1">Mining Rate</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-primary">{miningRate.toFixed(2)}</span>
                <span className="ml-1 text-gray-600">PTC / hour</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
              <div className="text-2xl font-bold text-gray-800">
                {miningStatus.miningCompleted 
                  ? "Completed" 
                  : miningStatus.miningActive 
                    ? miningStatus.timeRemainingFormatted || "--:--:--"
                    : "--:--:--"}
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <Progress 
            value={miningStatus.miningActive ? miningStatus.progress : 0} 
            className="h-3 mb-5" 
          />
          
          {/* Info message */}
          {miningStatus.miningActive && !miningStatus.miningCompleted && (
            <div className="mb-5 text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-100">
              <p className="text-center">
                Mining continues even when you're offline. You'll be notified when it's complete.
              </p>
            </div>
          )}
          
          {/* Action button */}
          <div className="flex justify-center">
            <Button 
              className={`px-8 py-4 h-auto rounded-full shadow-md transition flex items-center justify-center ${buttonClass} ${animation ? 'animate-pulse' : ''}`}
              onClick={handleAction}
              disabled={isMiningStarting || isClaimingReward || (miningStatus.miningActive && !miningStatus.miningCompleted)}
            >
              {buttonIcon}
              <span>{buttonText}</span>
            </Button>
          </div>
          
          {/* Offline warning */}
          {offlineMode && !miningStatus.miningActive && (
            <div className="mt-4 text-center text-sm text-red-600">
              Internet connection required to start mining or claim rewards
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
