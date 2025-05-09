import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMining } from "@/hooks/use-mining";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { formatAdBoostTimeRemaining } from "@/lib/mining";
import { applyReferralCode } from "@/lib/mining";
import { PlayIcon, GiftIcon, CopyIcon, CheckIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function BuffSection() {
  const { toast } = useToast();
  const { 
    miningStats, 
    isLoadingMiningStats, 
    adBoostTimeRemaining,
    adBoostProgress,
    watchRewardedAd,
    isWatchingAd
  } = useMining();
  
  const [referralInput, setReferralInput] = useState("");
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleApplyReferral = async () => {
    if (!referralInput) {
      toast({
        title: "Referral Code Required",
        description: "Please enter a referral code",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsApplyingReferral(true);
      await applyReferralCode(referralInput);
      toast({
        title: "Referral Applied",
        description: "Referral code applied successfully",
      });
      setShowReferralDialog(false);
      setReferralInput("");
    } catch (error: any) {
      toast({
        title: "Referral Failed",
        description: error.message || "Could not apply referral code",
        variant: "destructive",
      });
    } finally {
      setIsApplyingReferral(false);
    }
  };
  
  const handleCopyReferral = () => {
    if (!miningStats?.referralId) return;
    
    navigator.clipboard.writeText(miningStats.referralId);
    setCopied(true);
    
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (isLoadingMiningStats) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Mining Buffs</h2>
        <div className="space-y-4">
          <Card className="w-full">
            <CardContent className="p-5">
              <div className="animate-pulse">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="mt-4 h-20 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardContent className="p-5">
              <div className="animate-pulse">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="mt-4 h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }
  
  const referralMultiplier = miningStats?.referralMultiplier || 1.0;
  const referralCount = miningStats?.referralCount || 0;
  const referralProgress = (referralCount / 20) * 100; // 20 is max
  const referralId = miningStats?.referralId || "";
  
  const adBoostMultiplierValue = 5.0;
  const adBoostTimeRemainingText = formatAdBoostTimeRemaining(adBoostTimeRemaining);
  const adBoostActive = miningStats?.adBoostActive && adBoostTimeRemaining > 0;
  
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Mining Buffs</h2>
      
      <Card className="w-full mb-4">
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <GiftIcon className="h-5 w-5 text-accent mr-2" />
              <h3 className="font-semibold">Referral Boost</h3>
            </div>
            <span className="bg-primary/10 text-primary text-sm font-medium px-2 py-1 rounded-full">
              ×{referralMultiplier.toFixed(1)}
            </span>
          </div>
          
          <Progress value={referralProgress} className="h-2 mb-2" />
          
          <div className="flex justify-between text-xs text-gray-600">
            <span>{referralCount}/20 referrals</span>
            <span>Max: ×2.0</span>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-700 mb-2">Share your referral code:</p>
            <div className="flex">
              <Input
                value={referralId}
                readOnly
                className="bg-gray-100 text-gray-800 rounded-l-lg text-sm border-0 focus:ring-1 focus:ring-primary"
              />
              <Button
                className="bg-primary text-white rounded-r-lg text-sm font-medium"
                onClick={handleCopyReferral}
              >
                {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-sm"
                onClick={() => setShowReferralDialog(true)}
              >
                Apply Referral Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <PlayIcon className="h-5 w-5 text-accent mr-2" />
              <h3 className="font-semibold">Ad Boost</h3>
            </div>
            <span className="bg-primary/10 text-primary text-sm font-medium px-2 py-1 rounded-full">
              ×{adBoostMultiplierValue.toFixed(1)}
            </span>
          </div>
          
          <Progress value={adBoostProgress} className="h-2 mb-2 bg-gray-100">
            <div className="bg-accent h-full rounded-full" style={{ width: `${adBoostProgress}%` }}></div>
          </Progress>
          
          <div className="flex justify-between text-xs text-gray-600 mb-4">
            <span>{adBoostActive ? adBoostTimeRemainingText : "No active boost"}</span>
            <span>Max: 24h</span>
          </div>

          <Button 
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 h-auto rounded-lg shadow-sm transition flex items-center justify-center"
            onClick={() => watchRewardedAd()}
            disabled={isWatchingAd}
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            {isWatchingAd ? "Loading Ad..." : "Watch Ad (+2h Boost)"}
          </Button>
        </CardContent>
      </Card>
      
      <Dialog open={showReferralDialog} onOpenChange={setShowReferralDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Referral Code</DialogTitle>
            <DialogDescription>
              Apply a friend's referral code to help them boost their mining rate
            </DialogDescription>
          </DialogHeader>
          
          <Input
            placeholder="Enter referral code"
            value={referralInput}
            onChange={(e) => setReferralInput(e.target.value)}
          />
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowReferralDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApplyReferral}
              disabled={isApplyingReferral}
            >
              {isApplyingReferral ? "Applying..." : "Apply Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
