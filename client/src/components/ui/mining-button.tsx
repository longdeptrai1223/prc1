import { Button } from "@/components/ui/button";
import { CloudLightning, PlayCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiningButtonProps {
  isActive: boolean;
  onClick: () => void;
  isLoading?: boolean;
  text?: string;
  className?: string;
}

export function MiningButton({
  isActive,
  onClick,
  isLoading = false,
  text,
  className
}: MiningButtonProps) {
  const buttonText = text || (isActive ? "Mining Active" : "Start Mining");
  const loadingText = isActive ? "Claiming..." : "Starting...";
  
  return (
    <Button
      className={cn(
        "px-8 py-4 h-auto rounded-full shadow-md transition flex items-center justify-center",
        isActive ? 'bg-green-500 hover:bg-green-600 pulse-animation' : 'bg-primary hover:bg-primary/90',
        className
      )}
      onClick={onClick}
      disabled={isLoading}
    >
      <CloudLightning className="h-5 w-5 mr-2" />
      <span>
        {isLoading ? loadingText : buttonText}
      </span>
    </Button>
  );
}

export function AdBoostButton({
  onClick,
  isLoading = false,
  className
}: {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <Button
      className={cn(
        "w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 h-auto rounded-lg shadow-sm transition flex items-center justify-center",
        className
      )}
      onClick={onClick}
      disabled={isLoading}
    >
      <PlayCircleIcon className="h-5 w-5 mr-2" />
      {isLoading ? "Loading Ad..." : "Watch Ad (+2h Boost)"}
    </Button>
  );
}
