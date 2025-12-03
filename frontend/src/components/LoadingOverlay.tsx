import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const LoadingOverlay = () => {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 animate-pulse" />
          <Loader2 className="w-16 h-16 text-primary animate-spin absolute inset-0" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Analyzing Image...</p>
          <p className="text-sm text-muted-foreground mt-1">
            Running anomaly detection model
          </p>
        </div>
      </div>
    </Card>
  );
};

export default LoadingOverlay;
