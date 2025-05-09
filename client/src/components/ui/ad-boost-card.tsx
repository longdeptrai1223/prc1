import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlayIcon } from "lucide-react";
import { AdBoostButton } from "./mining-button";

interface AdBoostCardProps {
  adBoostMultiplier: number;
  adBoostProgress: number;
  adBoostTimeRemaining: string;
  adBoostActive: boolean;
  onWatchAd: () => void;
  isWatchingAd: boolean;
}

export function AdBoostCard({
  adBoostMultiplier,
  adBoostProgress,
  adBoostTimeRemaining,
  adBoostActive,
  onWatchAd,
  isWatchingAd
}: AdBoostCardProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <PlayIcon className="h-5 w-5 text-accent mr-2" />
            <h3 className="font-semibold">Ad Boost</h3>
          </div>
          <span className="bg-primary/10 text-primary text-sm font-medium px-2 py-1 rounded-full">
            ×{adBoostMultiplier.toFixed(1)}
          </span>
        </div>
        
        <Progress value={adBoostProgress} className="h-2 mb-2 bg-gray-100">
          <div className="bg-accent h-full rounded-full" style={{ width: `${adBoostProgress}%` }}></div>
        </Progress>
        
        <div className="flex justify-between text-xs text-gray-600 mb-4">
          <span>{adBoostActive ? adBoostTimeRemaining : "No active boost"}</span>
          <span>Max: 24h</span>
        </div>

        <AdBoostButton
          onClick={onWatchAd}
          isLoading={isWatchingAd}
        />
      </CardContent>
    </Card>
  );
}
