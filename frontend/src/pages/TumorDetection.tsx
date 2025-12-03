import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import DoctorProfile from "@/components/DoctorProfile";
import StatsPanel from "@/components/StatsPanel";
import ImagePredictor from "@/components/ImagePredictor";
import { calculateModelConfidence } from "@/utils/segmentationUtils";

interface ScannedImage {
  id: string;
  imageUrl: string;
  result: "Normal" | "Anomaly";
  confidence: number;
  date: string;
}

/**
 * Brain Tumor Detection Dashboard
 * 
 * Features:
 * - Protected route requiring authentication
 * - 3D brain tumor segmentation and analysis
 * - Patient selection and medical image visualization
 * - Results display with confidence scores
 * - Statistics dashboard
 * - Scanned images history for authenticated doctors
 */
const TumorDetection = () => {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  
  // Scanned images history (mock data - in real app, fetch from backend)
  const [scannedImages, setScannedImages] = useState<ScannedImage[]>([]);
  
  // Track segmentation analyses
  const [analyses, setAnalyses] = useState<Array<{ hasTumor: boolean; confidence: number; timestamp: number }>>([]);
  
  // Track last analyzed patient to avoid duplicates
  const [lastAnalyzedPatient, setLastAnalyzedPatient] = useState<string | null>(null);
  
  // Calculate statistics from analyses
  const calculateStats = () => {
    if (analyses.length === 0) {
      return {
        totalAnalyzed: 0,
        anomalyPercentage: 0,
        averageConfidence: 0,
      };
    }

    const totalAnalyzed = analyses.length;
    const tumorsDetected = analyses.filter(a => a.hasTumor).length;
    const tumorsMissed = analyses.filter(a => !a.hasTumor).length;
    const anomalyMissedRate = (tumorsMissed / totalAnalyzed) * 100;
    const totalConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0);
    const averageConfidence = totalConfidence / totalAnalyzed;

    return {
      totalAnalyzed,
      anomalyPercentage: anomalyMissedRate,
      averageConfidence,
    };
  };

  const stats = calculateStats();
  
  // Handle analysis completion from ImagePredictor
  const handleAnalysisComplete = (analysisData: any, confidence: number, patientId?: string) => {
    const hasTumor = analysisData?.metrics?.total_tumor?.volume_cm3 > 0;
    
    // Only track if this is a new patient analysis (not just a class change)
    if (patientId && patientId === lastAnalyzedPatient) {
      return; // Same patient, skip duplicate
    }
    
    if (patientId) {
      setLastAnalyzedPatient(patientId);
    }
    
    const newAnalysis = {
      hasTumor,
      confidence,
      timestamp: Date.now(),
    };
    
    setAnalyses((prev) => {
      // Check if this is a duplicate analysis (same result within 3 seconds)
      const isDuplicate = prev.some(
        (a) => Math.abs(a.timestamp - newAnalysis.timestamp) < 3000 && 
              a.hasTumor === hasTumor && 
              Math.abs(a.confidence - confidence) < 1
      );
      
      if (isDuplicate) {
        return prev; // Don't add duplicate
      }
      
      return [...prev, newAnalysis];
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-200/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Header */}
      <Header 
        onProfileClick={() => setShowProfile(!showProfile)}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {showProfile ? (
          // Doctor Profile View
          <DoctorProfile
            doctorName={user?.fullName || ""}
            email={user?.email || ""}
            speciality={user?.speciality}
            scannedImages={scannedImages}
            onLogout={() => setShowProfile(false)}
          />
        ) : (
          // Dashboard View
          <>
            {/* Statistics Panel */}
            <div className="mb-8">
              <StatsPanel
                totalAnalyzed={stats.totalAnalyzed}
                anomalyPercentage={stats.anomalyPercentage}
                averageConfidence={stats.averageConfidence}
              />
            </div>

            {/* Brain Tumor Segmentation and Analysis */}
            <ImagePredictor onAnalysisComplete={handleAnalysisComplete} />
          </>
        )}
      </main>
    </div>
  );
};

export default TumorDetection;

