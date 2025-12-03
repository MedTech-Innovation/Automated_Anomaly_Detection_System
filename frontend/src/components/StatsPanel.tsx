import { Card } from "@/components/ui/card";
import { FileImage, AlertTriangle, Target, Scan, Brain, Activity } from "lucide-react";

interface StatsPanelProps {
  // Segmentation-specific statistics
  totalAnalyzed?: number;  // Number of images/scans analyzed
  anomalyPercentage?: number;  // Tumor detection rate (percentage of scans with tumors)
  averageConfidence?: number;  // Average segmentation model confidence
  // Optional additional segmentation metrics
  totalSegments?: number;  // Total number of segmentation operations
  averageProcessingTime?: number;  // Average processing time in seconds
  totalVoxelsSegmented?: number;  // Total voxels segmented across all analyses
}

const StatsPanel = ({ 
  totalAnalyzed = 0,
  anomalyPercentage = 0,
  averageConfidence = 0,
  totalSegments = 0,
  averageProcessingTime = 0,
  totalVoxelsSegmented = 0,
}: StatsPanelProps) => {
  const stats = [
    {
      label: "Scans Analyzed",
      value: totalAnalyzed > 0 ? totalAnalyzed.toString() : (totalSegments > 0 ? totalSegments.toString() : "0"),
      icon: Scan,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      description: totalAnalyzed > 0 
        ? "Total number of MRI scans analyzed" 
        : "Total segmentation operations performed",
    },
    {
      label: "Average of Misdetection",
      value: totalAnalyzed === 0 || averageConfidence === 0 
        ? "0.0%" 
        : `${Math.max(0, (1 - averageConfidence / 100) * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      description: "Average misdetection rate (must be less than 15%)",
    },
    {
      label: "Model Accuracy",
      value: `${averageConfidence.toFixed(1)}%`,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      description: "Average model confidence for anomaly detection",
    },
  ];

  // Add additional stats if available
  if (averageProcessingTime > 0) {
    stats.push({
      label: "Avg. Processing Time",
      value: `${averageProcessingTime.toFixed(1)}s`,
      icon: Activity,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      description: "Average time per segmentation analysis",
    });
  }

  if (totalVoxelsSegmented > 0) {
    stats.push({
      label: "Total Voxels Segmented",
      value: totalVoxelsSegmented.toLocaleString(),
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      description: "Total voxels processed across all analyses",
    });
  }

  return (
    <Card className="p-4 shadow-sm border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-700">
            Statistics Dashboard
          </h2>
        </div>
      </div>
      
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${stats.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-3 rounded-lg border ${stat.borderColor} ${stat.bgColor}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 w-full">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} border ${stat.borderColor} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color} break-words`}>
                    {stat.value}
                  </p>
                  {stat.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-tight">
                      {stat.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Activity className="w-4 h-4" />
          <span>
            {totalAnalyzed > 0 && (
              <>
                {totalAnalyzed} scan{totalAnalyzed !== 1 ? 's' : ''} analyzed
                {averageConfidence > 0 && ` • ${Math.max(0, (1 - averageConfidence / 100) * 100).toFixed(1)}% avg misdetection`}
                {averageConfidence === 0 && ` • 0.0% avg misdetection`}
              </>
            )}
            {totalAnalyzed === 0 && totalSegments > 0 && (
              <>
                {totalSegments} segmentation{totalSegments !== 1 ? 's' : ''} performed
              </>
            )}
            {averageConfidence > 0 && ` • ${averageConfidence.toFixed(1)}% avg confidence`}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default StatsPanel;
