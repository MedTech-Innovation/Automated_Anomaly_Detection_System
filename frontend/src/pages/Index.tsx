import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import DoctorProfile from "@/components/DoctorProfile";
import UploadArea from "@/components/UploadArea";
import ResultsPanel from "@/components/ResultsPanel";
import VisualizationPanel from "@/components/VisualizationPanel";
import StatsPanel from "@/components/StatsPanel";
import ImagePredictor from "@/components/ImagePredictor";
import LoadingOverlay from "@/components/LoadingOverlay";

interface AnalysisResult {
  result: "Normal" | "Anomaly";
  confidence: number;
}

interface ScannedImage {
  id: string;
  imageUrl: string;
  result: "Normal" | "Anomaly";
  confidence: number;
  date: string;
}

/**
 * Anomaly Detection Dashboard - Main Page
 * 
 * Features:
 * - Protected route requiring authentication
 * - Image upload and analysis (supports 3D medical formats: .nii, .nii.gz, .hdr/.img)
 * - Results display with confidence scores
 * - Statistics dashboard
 * - Scanned images history for authenticated doctors
 * 
 * TODO for backend integration:
 * - Store scanned images in database
 * - Fetch doctor profile and scanned images from backend
 * - Implement real anomaly detection API call
 * - Process 3D medical volumes (convert to 2D slices for preview)
 */
const Index = () => {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  
  // Image upload and analysis state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [heatmapImage, setHeatmapImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Scanned images history (mock data - in real app, fetch from backend)
  const [scannedImages, setScannedImages] = useState<ScannedImage[]>([]);
  
  // Track segmentation analyses
  const [analyses, setAnalyses] = useState<Array<{ hasTumor: boolean; confidence: number; timestamp: number }>>([]);
  
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
      anomalyPercentage: anomalyMissedRate, // Now represents miss rate
      averageConfidence,
    };
  };

  const stats = calculateStats();

  // Track last analyzed patient to avoid duplicates
  const [lastAnalyzedPatient, setLastAnalyzedPatient] = useState<string | null>(null);
  
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


  /**
   * Mock API Call for Image Analysis
   * Simulates backend anomaly detection
   * 
   * TODO: Replace with real API endpoint
   * Example:
   * const formData = new FormData();
   * formData.append('image', file);
   * const response = await fetch('/api/analyze', {
   *   method: 'POST',
   *   body: formData
   * });
   */
  const mockApiCall = async (file: File): Promise<AnalysisResult> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate random results for demo
        const isAnomaly = Math.random() > 0.5;
        const confidence = Math.floor(Math.random() * 20) + 80; // 80-100%
        
        resolve({
          result: isAnomaly ? "Anomaly" : "Normal",
          confidence,
        });
      }, 2000); // 2 second delay to simulate API processing
    });
  };

  /**
   * Image Upload Handler
   * Processes uploaded file and triggers mock analysis
   * Supports 3D medical imaging formats (.nii, .nii.gz, .hdr/.img)
   */
  const handleImageUpload = async (file: File) => {
    // Create preview URL for standard images
    // For 3D formats, this would need processing to extract a 2D slice
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      // Mock API call - replace with real endpoint
      const result = await mockApiCall(file);
      setAnalysisResult(result);
      
      // Set mock heatmap image (in production, this would come from the API)
      setHeatmapImage("/src/assets/sample_heatmap.png");
      
      // Add to scanned images history
      const newScan: ScannedImage = {
        id: Date.now().toString(),
        imageUrl,
        result: result.result,
        confidence: result.confidence,
        date: new Date().toLocaleDateString(),
      };
      setScannedImages((prev) => [newScan, ...prev]);
      
      // Stats are now calculated automatically from analyses array

      toast({
        title: "Analysis Complete",
        description: `Result: ${result.result} (${result.confidence}% confidence)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-200/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Header with logo, branding, and logout */}
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

            <ImagePredictor onAnalysisComplete={handleAnalysisComplete} />

            

            {/* Detailed Visualization Section */}
            {analysisResult && (
              <VisualizationPanel 
                originalImage={uploadedImage}
                heatmapImage={heatmapImage}
                result={analysisResult.result}
                confidence={analysisResult.confidence}
              />
            )}
          </>
        )}
      </main>

      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay />}
    </div>
  );
};

export default Index;

