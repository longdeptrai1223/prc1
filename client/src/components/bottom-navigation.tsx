import { useLocation } from "wouter";
import { Home, Users, BarChart2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNavigation() {
  const [location, navigate] = useLocation();
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex justify-around">
          <button 
            className={cn(
              "flex flex-col items-center justify-center py-2 px-3", 
              isActive("/home") ? "text-primary" : "text-gray-500"
            )}
            onClick={() => navigate("/home")}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium mt-1">Home</span>
          </button>
          
          <button 
            className={cn(
              "flex flex-col items-center justify-center py-2 px-3", 
              isActive("/referrals") ? "text-primary" : "text-gray-500"
            )}
            onClick={() => navigate("/referrals")}
          >
            <Users className="h-6 w-6" />
            <span className="text-xs font-medium mt-1">Referrals</span>
          </button>
          
          <button 
            className={cn(
              "flex flex-col items-center justify-center py-2 px-3", 
              isActive("/stats") ? "text-primary" : "text-gray-500"
            )}
            onClick={() => navigate("/stats")}
          >
            <BarChart2 className="h-6 w-6" />
            <span className="text-xs font-medium mt-1">Stats</span>
          </button>
          
          <button 
            className={cn(
              "flex flex-col items-center justify-center py-2 px-3", 
              isActive("/profile") ? "text-primary" : "text-gray-500"
            )}
            onClick={() => navigate("/profile")}
          >
            <User className="h-6 w-6" />
            <span className="text-xs font-medium mt-1">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
