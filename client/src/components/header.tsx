import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMining } from "@/hooks/use-mining";
import { BellIcon, SettingsIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Header() {
  const { user } = useAuth();
  const { miningStats, isLoadingMiningStats } = useMining();
  
  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user?.displayName) return "PTC";
    
    return user.displayName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Avatar className="w-10 h-10 rounded-full bg-primary/10 mr-3 overflow-hidden">
            <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          
          <div>
            <p className="font-medium text-sm text-gray-900">
              {user?.displayName || "User"}
            </p>
            <div className="flex items-center">
              <span className="text-xs text-gray-500">Balance:</span>
              {isLoadingMiningStats ? (
                <Skeleton className="ml-1 h-4 w-16" />
              ) : (
                <span className="ml-1 text-sm font-semibold text-primary">
                  {(miningStats?.totalMined || 0).toFixed(1)} PTC
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="p-2 text-gray-600 rounded-full hover:bg-gray-100">
            <BellIcon className="h-6 w-6" />
          </Button>
          
          <Button variant="ghost" size="icon" className="p-2 text-gray-600 rounded-full hover:bg-gray-100">
            <SettingsIcon className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
