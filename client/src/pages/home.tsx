import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import MiningSection from "@/components/mining-section";
import BuffSection from "@/components/buff-section";
import StatsSection from "@/components/stats-section";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <main className="flex-grow pb-16">
      <div className="max-w-lg mx-auto px-4 py-5">
        <MiningSection />
        <BuffSection />
        <StatsSection />
      </div>
    </main>
  );
}
