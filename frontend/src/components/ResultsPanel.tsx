import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ResultsPanelProps {
  result: "Normal" | "Anomaly" | null;
  confidence: number | null;
}

const ResultsPanel = ({ result, confidence }: ResultsPanelProps) => {
  if (!result || confidence === null) {
    return null;
  }

  const isAnomaly = result === "Anomaly";

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-foreground">Analysis Results</h2>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${isAnomaly ? "bg-warning/10" : "bg-success/10"}
          `}>
            {isAnomaly ? (
              <AlertCircle className="w-6 h-6 text-warning" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-success" />
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Detection Result</p>
            <Badge 
              variant={isAnomaly ? "destructive" : "default"}
              className={isAnomaly ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"}
            >
              {result}
            </Badge>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-muted-foreground">Confidence Score</span>
            <span className="text-2xl font-bold text-foreground">{confidence}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAnomaly ? "bg-warning" : "bg-success"
              }`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ResultsPanel;
