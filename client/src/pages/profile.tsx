import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useMining } from "@/hooks/use-mining";
import { showInterstitialAd } from "@/lib/admob";
import {
  registerForPushNotifications,
  toggleNotifications
} from "@/lib/notifications";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, Bell, Shield, Info, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, isLoading: isLoadingAuth, signOut } = useAuth();
  const [location, navigate] = useLocation();
  const { miningStats, isLoadingMiningStats } = useMining();
  const { toast } = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);

  // Fetch notification settings
  const { data: notificationSettings, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['/api/notifications/settings'],
    enabled: !!user,
  });
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigate("/");
    }
  }, [user, isLoadingAuth, navigate]);

  // Initialize notification settings from data
  useEffect(() => {
    if (notificationSettings) {
      setNotificationsEnabled(notificationSettings.enabled);
    }
  }, [notificationSettings]);

  // Handle toggling notifications
  const handleToggleNotifications = async () => {
    setIsTogglingNotifications(true);
    
    try {
      const newState = !notificationsEnabled;
      await toggleNotifications(newState);
      setNotificationsEnabled(newState);
      
      toast({
        title: newState ? "Notifications Enabled" : "Notifications Disabled",
        description: newState 
          ? "You will now receive mining notifications" 
          : "You will no longer receive notifications",
      });
    } catch (error) {
      console.error("Failed to toggle notifications:", error);
      toast({
        title: "Failed to change notification settings",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Show an ad before logging out (common monetization strategy)
      await showInterstitialAd();
    } catch (error) {
      console.error("Failed to show ad before logout:", error);
    }
    
    // Proceed with logout
    await signOut();
    setShowLogoutConfirm(false);
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.displayName) return "PTC";
    
    return user.displayName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoadingAuth || isLoadingMiningStats) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex-grow pb-16">
      <div className="max-w-lg mx-auto px-4 py-5">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center">
              <Avatar className="h-16 w-16 mr-4">
                <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              
              <div>
                <h2 className="text-xl font-semibold">{user?.displayName}</h2>
                <p className="text-gray-600 text-sm">{user?.email}</p>
                <p className="text-sm mt-1">
                  <span className="text-gray-500">Balance:</span>
                  <span className="ml-1 font-medium text-primary">
                    {(miningStats?.totalMined || 0).toFixed(1)} PTC
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          
          <CardContent className="px-5 pb-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <Label htmlFor="notifications" className="font-medium">
                      Push Notifications
                    </Label>
                    <p className="text-gray-500 text-sm">
                      Get notified when mining is ready
                    </p>
                  </div>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={handleToggleNotifications}
                  disabled={isTogglingNotifications}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Help & Info</CardTitle>
          </CardHeader>
          
          <CardContent className="px-5 pb-2">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start py-2 px-2 h-auto"
                onClick={() => window.open("https://ptc-help.example.com", "_blank")}
              >
                <HelpCircle className="h-5 w-5 text-gray-500 mr-3" />
                <span>Help Center</span>
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start py-2 px-2 h-auto"
                onClick={() => window.open("https://ptc-privacy.example.com", "_blank")}
              >
                <Shield className="h-5 w-5 text-gray-500 mr-3" />
                <span>Privacy Policy</span>
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start py-2 px-2 h-auto"
                onClick={() => window.open("https://ptc-about.example.com", "_blank")}
              >
                <Info className="h-5 w-5 text-gray-500 mr-3" />
                <span>About PTC</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </Button>
      </div>
      
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? Mining will continue in the background.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowLogoutConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
