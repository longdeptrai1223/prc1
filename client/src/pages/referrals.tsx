import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReferralCard } from "@/components/ui/referral-card";
import { useMining } from "@/hooks/use-mining";
import { applyReferralCode } from "@/lib/mining";
import { useToast } from "@/hooks/use-toast";
import { Users, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Referrals() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const { miningStats, isLoadingMiningStats } = useMining();
  const { toast } = useToast();

  const [referralInput, setReferralInput] = useState("");
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);
  
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
  
  if (isLoading || isLoadingMiningStats) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const referralMultiplier = miningStats?.referralMultiplier || 1.0;
  const referralCount = miningStats?.referralCount || 0;
  const referralId = miningStats?.referralId || "";
  
  // Mock referral users (would be fetched from server in real app)
  // In a real app, this would be actual referred users 
  const referredUsers = Array(referralCount).fill(0).map((_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    joinedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));
  
  return (
    <main className="flex-grow pb-16">
      <div className="max-w-lg mx-auto px-4 py-5">
        <h1 className="text-2xl font-bold mb-4">Referrals</h1>
        
        <div className="mb-6">
          <ReferralCard
            referralId={referralId}
            referralCount={referralCount}
            referralMultiplier={referralMultiplier}
            onApplyCode={() => setShowReferralDialog(true)}
          />
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Share2 className="h-5 w-5 mr-2 text-primary" />
              How Referrals Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full mr-2 mt-0.5">1</span>
                <span>Share your unique referral code with friends</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full mr-2 mt-0.5">2</span>
                <span>When they apply your code, your mining rate increases by ×0.1</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full mr-2 mt-0.5">3</span>
                <span>For every referral, you also earn a 0.05 PTC bonus</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full mr-2 mt-0.5">4</span>
                <span>You can get up to 20 referrals for a maximum boost of ×2.0</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Your Referrals
            </CardTitle>
            <CardDescription>
              {referralCount} out of 20 maximum referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referralCount > 0 ? (
              <div className="space-y-3">
                {referredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          Joined {user.joinedDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                      +0.1×
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No referrals yet</p>
                <p className="text-sm mt-1">Share your referral code to start earning bonuses</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
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
    </main>
  );
}
