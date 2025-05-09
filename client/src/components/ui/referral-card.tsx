import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GiftIcon, CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ReferralCardProps {
  referralId: string;
  referralCount: number;
  referralMultiplier: number;
  onApplyCode: () => void;
}

export function ReferralCard({
  referralId,
  referralCount,
  referralMultiplier,
  onApplyCode
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const referralProgress = (referralCount / 20) * 100; // 20 is max
  
  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralId);
    setCopied(true);
    
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card className="w-full">
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
              onClick={onApplyCode}
            >
              Apply Referral Code
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
