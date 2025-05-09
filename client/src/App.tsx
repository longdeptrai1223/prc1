import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import LoginScreen from "@/components/login-screen";
import Home from "@/pages/home";
import Referrals from "@/pages/referrals";
import Stats from "@/pages/stats";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Header from "@/components/header";
import BottomNavigation from "@/components/bottom-navigation";

function Router() {
  const [location, setLocation] = useLocation();
  
  return (
    <>
      {location !== "/" && (
        <Header />
      )}
      
      <Switch>
        <Route path="/" component={LoginScreen} />
        <Route path="/home" component={Home} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/stats" component={Stats} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
      
      {location !== "/" && (
        <BottomNavigation />
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen flex flex-col bg-light text-gray-800">
            <Router />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
