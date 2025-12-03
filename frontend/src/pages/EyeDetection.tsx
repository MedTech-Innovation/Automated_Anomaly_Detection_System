import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import DoctorProfile from "@/components/DoctorProfile";
import StatsPanel from "@/components/StatsPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle2, XCircle, Info, Download, FileText, Calendar, User, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import { generateMedicalPDFReport, imageToBase64 } from "@/utils/pdfReportGenerator";
import { toast as sonnerToast } from "sonner";

interface AnalysisResult {
  result: "Anomaly" | "Normal";
  confidence: number;
  modelPrecision: number;
  conditionType?: string;
  severityLevel?: number; // 0-4 scale for diabetic retinopathy
  explanation?: string;
  recommendations?: string;
  top3Predictions?: Array<{
    class: string;
    confidence: number;
    result_type: string;
  }>;
  allPredictions?: { [key: string]: number };
}

interface ScannedImage {
  id: string;
  imageUrl: string;
  result: "Normal" | "Anomaly";
  confidence: number;
  date: string;
}

/**
 * Eye Anomaly Detection Dashboard
 * 
 * Features:
 * - Protected route requiring authentication
 * - Image upload and analysis for eye conditions
 * - Results display with confidence scores
 * - Statistics dashboard
 * - Scanned images history for authenticated doctors
 */
const EyeDetection = () => {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  
  // Image upload and analysis state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [heatmapImage, setHeatmapImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);
  const heatmapImageRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  
  // Scanned images history (mock data - in real app, fetch from backend)
  const [scannedImages, setScannedImages] = useState<ScannedImage[]>([]);
  
  // Track analyses for statistics
  const [analyses, setAnalyses] = useState<Array<{ hasAnomaly: boolean; confidence: number; timestamp: number }>>([]);
  
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
    const anomaliesDetected = analyses.filter(a => a.hasAnomaly).length;
    const anomaliesMissed = analyses.filter(a => !a.hasAnomaly).length;
    const anomalyMissedRate = (anomaliesMissed / totalAnalyzed) * 100;
    const totalConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0);
    const averageConfidence = totalConfidence / totalAnalyzed;

    return {
      totalAnalyzed,
      anomalyPercentage: anomalyMissedRate,
      averageConfidence,
    };
  };

  const stats = calculateStats();

  // Sync heatmap image size with original image
  useEffect(() => {
    if (originalImageRef.current && heatmapImageRef.current && uploadedImage && heatmapImage) {
      const syncSizes = () => {
        const originalImg = originalImageRef.current;
        const heatmapImg = heatmapImageRef.current;
        
        if (originalImg && heatmapImg) {
          // Wait for both images to load
          if (originalImg.complete && heatmapImg.complete) {
            // Get the displayed dimensions of the original image
            const displayedWidth = originalImg.offsetWidth;
            const displayedHeight = originalImg.offsetHeight;
            
            // Set heatmap container and image to match
            const heatmapContainer = heatmapImg.parentElement;
            if (heatmapContainer) {
              heatmapContainer.style.width = `${displayedWidth}px`;
              heatmapContainer.style.height = `${displayedHeight}px`;
            }
            
            heatmapImg.style.width = `${displayedWidth}px`;
            heatmapImg.style.height = `${displayedHeight}px`;
          }
        }
      };

      // Sync immediately if images are already loaded
      syncSizes();
      
      // Also sync on window resize
      window.addEventListener('resize', syncSizes);
      
      return () => {
        window.removeEventListener('resize', syncSizes);
      };
    }
  }, [uploadedImage, heatmapImage]);

  /**
   * API Call for Eye Image Analysis
   * Placeholder for future backend integration
   */
  const analyzeEyeImage = async (file: File): Promise<AnalysisResult> => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axios.post("http://localhost:5000/analyze_eye", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Analysis failed');
    }

    const data = response.data;
    
    // Set heatmap image
    if (data.heatmap) {
      setHeatmapImage(`data:image/jpeg;base64,${data.heatmap}`);
    }

    return {
      result: data.result_type as "Anomaly" | "Normal",
      confidence: data.confidence,
      modelPrecision: data.model_precision,
      conditionType: data.predicted_class,
      severityLevel: data.severity_level, // 0-4 scale
      explanation: data.explanation,
      recommendations: data.recommendations,
      top3Predictions: data.top3_predictions,
      allPredictions: data.all_predictions,
    };
  };

  /**
   * Image Upload Handler
   * Processes uploaded file and triggers analysis
   */
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setHeatmapImage(null);
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeEyeImage(file);
      setAnalysisResult(result);
      
      // Add to scanned images history
      const newScan: ScannedImage = {
        id: Date.now().toString(),
        imageUrl,
        result: result.result === "Normal" ? "Normal" : "Anomaly",
        confidence: result.confidence,
        date: new Date().toLocaleDateString(),
      };
      setScannedImages((prev) => [newScan, ...prev]);
      
      // Track for statistics
      const newAnalysis = {
        hasAnomaly: result.result !== "Normal",
        confidence: result.confidence,
        timestamp: Date.now(),
      };
      setAnalyses((prev) => [...prev, newAnalysis]);

      toast({
        title: "Analysis Complete",
        description: `Result: ${result.result} (${result.confidence}% confidence)${result.conditionType ? ` - ${result.conditionType}` : ''}`,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  /**
   * Load image from URL
   */
  const handleLoadFromUrl = async () => {
    if (!imageUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingUrl(true);
    try {
      let url: URL;
      try {
        url = new URL(imageUrl.trim());
      } catch {
        throw new Error("Invalid URL format. Please enter a valid URL (e.g., https://example.com/image.jpg)");
      }
      
      let response: Response;
      try {
        response = await fetch(imageUrl.trim(), { mode: 'cors' });
      } catch (corsError) {
        const testImg = new Image();
        testImg.crossOrigin = "anonymous";
        
        return new Promise<void>((resolve, reject) => {
          testImg.onload = async () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = testImg.width;
              canvas.height = testImg.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(testImg, 0, 0);
                canvas.toBlob(async (blob) => {
                  if (blob) {
                    const file = new File([blob], "image.jpg", { type: "image/jpeg" });
                    await handleImageUpload(file);
                    setImageUrl("");
                    setIsLoadingUrl(false);
                    resolve();
                  } else {
                    reject(new Error("Failed to convert image"));
                  }
                }, "image/jpeg");
              } else {
                reject(new Error("Failed to create canvas context"));
              }
            } catch (error: any) {
              reject(error);
            }
          };
          testImg.onerror = () => {
            reject(new Error("Failed to load image. The URL may not be accessible or may not be an image."));
          };
          testImg.src = imageUrl.trim();
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error("URL does not point to an image file");
      }

      const file = new File([blob], "image.jpg", { type: blob.type });
      await handleImageUpload(file);
      setImageUrl("");
    } catch (error: any) {
      console.error("Error loading image from URL:", error);
      toast({
        title: "Error loading image",
        description: error.message || "Failed to load image from URL. Please check the URL and ensure it's accessible.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!analysisResult || !uploadedImage) {
      toast({
        title: "Error",
        description: "Please analyze an image first before generating a PDF report.",
        variant: "destructive",
      });
      return;
    }

    try {
      sonnerToast.loading("Generating PDF report...", { id: "pdf-loading" });

      // Convert images to base64
      const originalImageBase64 = await imageToBase64(uploadedImage);
      const heatmapImageBase64 = heatmapImage ? await imageToBase64(heatmapImage) : undefined;

      const reportDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const reportId = `EYE-${Date.now()}`;
      const fileNumber = `FILE-${Date.now().toString().slice(-8)}`;

      const pdfData = {
        reportType: "Eye" as const,
        reportTitle: "Diabetic Retinopathy Detection Analysis Report",
        doctorName: user?.fullName || "Dr. User",
        doctorEmail: user?.email,
        reportDate,
        reportId,
        fileNumber,
        originalImage: originalImageBase64,
        heatmapImage: heatmapImageBase64,
        clinicalStatus: analysisResult.result,
        confidence: analysisResult.confidence,
        modelPrecision: analysisResult.modelPrecision,
        conditionType: analysisResult.conditionType,
        severityLevel: analysisResult.severityLevel,
        explanation: analysisResult.explanation,
        recommendations: analysisResult.recommendations,
        top3Predictions: analysisResult.top3Predictions,
        allPredictions: analysisResult.allPredictions,
      };

      const doc = await generateMedicalPDFReport(pdfData);
      doc.save(`Eye_Analysis_Report_${fileNumber}_${Date.now()}.pdf`);
      
      sonnerToast.success("PDF report downloaded successfully", { id: "pdf-loading" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      sonnerToast.error("Failed to generate PDF report", { id: "pdf-loading" });
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate Text Report
  const generateTextReport = () => {
    if (!analysisResult) return;

    const report = `
EYE ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}
Analyzed By: ${user?.fullName || "Dr. User"}

CLINICAL STATUS: ${analysisResult.result}
Model Confidence: ${analysisResult.modelPrecision.toFixed(2)}%
Detection Confidence: ${analysisResult.confidence}%

${analysisResult.conditionType ? `Condition Type: ${analysisResult.conditionType}\n` : ''}

CLINICAL INTERPRETATION:
${analysisResult.explanation || "No interpretation available."}

${analysisResult.recommendations ? `RECOMMENDATIONS:\n${analysisResult.recommendations}` : ''}

---
This report is generated by an AI model and is intended for preliminary assessment only.
Always consult with a qualified healthcare provider for accurate diagnosis.
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eye-analysis-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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

            {/* Main Content Area - 3 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Drag and Drop Upload */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="p-6 shadow-xl rounded-2xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 border-2 border-blue-100 h-full">
                  <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                    Upload Eye Image
                  </h2>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                      isDragging
                        ? "border-blue-500 bg-blue-100/50 scale-105"
                        : "border-blue-300 hover:border-blue-500 hover:bg-blue-50/50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-blue-600 scale-110" : "text-blue-500"}`} />
                    <p className="text-lg font-semibold text-slate-700 mb-2">
                      {isDragging ? "Drop image here" : "Drag & Drop Image"}
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                      or click to browse
                    </p>
                    <p className="text-xs text-slate-400">
                      Supported: JPG, PNG, JPEG
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Load from URL Section */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <LinkIcon className="w-4 h-4 text-slate-600" />
                      <h3 className="text-sm font-semibold text-slate-700">Or load from URL</h3>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Enter image URL..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isLoadingUrl) {
                            handleLoadFromUrl();
                          }
                        }}
                      />
                      <Button
                        onClick={handleLoadFromUrl}
                        disabled={isLoadingUrl || !imageUrl.trim()}
                        className="px-4"
                      >
                        {isLoadingUrl ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Load
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {uploadedImage && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setUploadedImage(null);
                          setHeatmapImage(null);
                          setAnalysisResult(null);
                          setImageUrl("");
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Clear Image
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Column 2: Image and Heatmap Display */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="p-6 shadow-xl rounded-2xl bg-gradient-to-br from-white via-slate-50/30 to-white border-2 border-slate-200 h-full">
                  <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Image Visualization
                  </h2>
                  
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-slate-200 rounded-xl">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-slate-500">Analyzing image...</p>
                    </div>
                  ) : uploadedImage ? (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden border-2 border-slate-200 shadow-lg bg-slate-50">
                        <img
                          ref={originalImageRef}
                          src={uploadedImage}
                          alt="Uploaded eye image"
                          className="w-full h-auto max-h-[300px] object-contain mx-auto block"
                          onLoad={() => {
                            // Trigger size sync when original image loads
                            if (originalImageRef.current && heatmapImageRef.current) {
                              const originalImg = originalImageRef.current;
                              const heatmapImg = heatmapImageRef.current;
                              const displayedWidth = originalImg.offsetWidth;
                              const displayedHeight = originalImg.offsetHeight;
                              
                              const heatmapContainer = heatmapImg.parentElement;
                              if (heatmapContainer) {
                                heatmapContainer.style.width = `${displayedWidth}px`;
                                heatmapContainer.style.height = `${displayedHeight}px`;
                              }
                              
                              heatmapImg.style.width = `${displayedWidth}px`;
                              heatmapImg.style.height = `${displayedHeight}px`;
                            }
                          }}
                        />
                      </div>
                      {heatmapImage && (
                        <div className="space-y-3">
                          <div className="relative rounded-lg overflow-hidden border-2 border-slate-200 shadow-lg bg-slate-50 mx-auto">
                            <img
                              ref={heatmapImageRef}
                              src={heatmapImage}
                              alt="Heatmap visualization"
                              className="object-contain mx-auto block"
                              onLoad={() => {
                                // Sync sizes when heatmap loads
                                if (originalImageRef.current && heatmapImageRef.current) {
                                  const originalImg = originalImageRef.current;
                                  const heatmapImg = heatmapImageRef.current;
                                  const displayedWidth = originalImg.offsetWidth;
                                  const displayedHeight = originalImg.offsetHeight;
                                  
                                  const heatmapContainer = heatmapImg.parentElement;
                                  if (heatmapContainer) {
                                    heatmapContainer.style.width = `${displayedWidth}px`;
                                    heatmapContainer.style.height = `${displayedHeight}px`;
                                  }
                                  
                                  heatmapImg.style.width = `${displayedWidth}px`;
                                  heatmapImg.style.height = `${displayedHeight}px`;
                                }
                              }}
                            />
                          </div>
                          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-blue-800 leading-relaxed">
                                  <span className="font-semibold"> Warmer colors (red/orange)</span> indicate regions with higher attention, 
                            
                                  <span className="font-semibold"> Cooler colors (blue/green)</span> represent areas with lower attention. 
                  
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-slate-200 rounded-xl">
                      <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
                      <p className="text-slate-400 text-sm">Upload an image to see visualization</p>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Column 3: Analysis Results */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="p-6 shadow-xl rounded-2xl bg-gradient-to-br from-white via-slate-50/30 to-white border-2 border-slate-200 h-full">
                  <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Analysis Results
                  </h2>
                  
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-blue-200 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-blue-600 font-semibold mb-2">Analyzing image...</p>
                      <p className="text-sm text-slate-500 text-center max-w-xs">
                        Processing eye image and generating analysis results
                      </p>
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-4">
                      {/* Model Confidence */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="p-3 rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-green-800">Model Confidence</span>
                          <span className="text-base font-bold text-green-700">{analysisResult.modelPrecision.toFixed(2)}%</span>
                        </div>
                        <div className="mt-1.5 h-2 bg-green-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${analysisResult.modelPrecision}%` }}
                            transition={{ duration: 1.0, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          />
                        </div>
                      </motion.div>

                    

                      {/* Diabetic Retinopathy Severity Scale (0-4) */}
                      {analysisResult.severityLevel !== undefined && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                        >
                          <h3 className="text-sm font-semibold text-slate-700 mb-3">Diabetic Retinopathy Severity Scale</h3>
                          <div className="space-y-3">
                            {/* Scale Bar */}
                            <div className="relative">
                              {/* Background scale bar */}
                              <div className="h-8 bg-gradient-to-r from-green-200 via-yellow-200 via-orange-200 to-red-300 rounded-lg relative overflow-hidden">
                                {/* Markers for 0, 1, 2, 3, 4 */}
                                {[0, 1, 2, 3, 4].map((level) => (
                                  <div
                                    key={level}
                                    className="absolute top-0 bottom-0 w-0.5 bg-slate-800"
                                    style={{ left: `${(level / 4) * 100}%` }}
                                  />
                                ))}
                                
                                {/* Filled portion up to predicted level */}
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(analysisResult.severityLevel / 4) * 100}%` }}
                                  transition={{ duration: 1.0, ease: "easeOut" }}
                                  className={`h-full ${
                                    analysisResult.severityLevel === 0
                                      ? "bg-green-500"
                                      : analysisResult.severityLevel === 1
                                      ? "bg-yellow-500"
                                      : analysisResult.severityLevel === 2
                                      ? "bg-orange-500"
                                      : analysisResult.severityLevel === 3
                                      ? "bg-red-500"
                                      : "bg-red-700"
                                  } rounded-l-lg`}
                                />
                                
                                {/* Predicted level indicator */}
                                <motion.div
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.5, delay: 0.8 }}
                                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 border-2 border-white rounded-full shadow-lg"
                                  style={{ left: `calc(${(analysisResult.severityLevel / 4) * 100}% - 12px)` }}
                                />
                              </div>
                              
                              {/* Scale labels */}
                              <div className="flex justify-between mt-2 text-xs font-medium text-slate-600">
                                <span className={analysisResult.severityLevel === 0 ? "text-green-700 font-bold" : ""}>0</span>
                                <span className={analysisResult.severityLevel === 1 ? "text-yellow-700 font-bold" : ""}>1</span>
                                <span className={analysisResult.severityLevel === 2 ? "text-orange-700 font-bold" : ""}>2</span>
                                <span className={analysisResult.severityLevel === 3 ? "text-red-700 font-bold" : ""}>3</span>
                                <span className={analysisResult.severityLevel === 4 ? "text-red-900 font-bold" : ""}>4</span>
                              </div>
                              
                              {/* Scale descriptions */}
                              <div className="flex justify-between mt-1 text-xs text-slate-500">
                                <span className={analysisResult.severityLevel === 0 ? "text-green-700 font-semibold" : ""}>No DR</span>
                                <span className={analysisResult.severityLevel === 1 ? "text-yellow-700 font-semibold" : ""}>Mild</span>
                                <span className={analysisResult.severityLevel === 2 ? "text-orange-700 font-semibold" : ""}>Moderate</span>
                                <span className={analysisResult.severityLevel === 3 ? "text-red-700 font-semibold" : ""}>Severe</span>
                                <span className={analysisResult.severityLevel === 4 ? "text-red-900 font-semibold" : ""}>Proliferative</span>
                              </div>
                            </div>
                            
                            {/* Current prediction display */}
                            <div className={`p-3 rounded-lg border-2 ${
                              analysisResult.severityLevel === 0
                                ? "border-green-300 bg-green-50"
                                : analysisResult.severityLevel === 1
                                ? "border-yellow-300 bg-yellow-50"
                                : analysisResult.severityLevel === 2
                                ? "border-orange-300 bg-orange-50"
                                : analysisResult.severityLevel === 3
                                ? "border-red-300 bg-red-50"
                                : "border-red-500 bg-red-100"
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-600 mb-1">Predicted Severity Level</p>
                                  <p className={`text-lg font-bold ${
                                    analysisResult.severityLevel === 0
                                      ? "text-green-800"
                                      : analysisResult.severityLevel === 1
                                      ? "text-yellow-800"
                                      : analysisResult.severityLevel === 2
                                      ? "text-orange-800"
                                      : analysisResult.severityLevel === 3
                                      ? "text-red-800"
                                      : "text-red-900"
                                  }`}>
                                    Level {analysisResult.severityLevel}: {analysisResult.conditionType || "Unknown"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Confidence</p>
                                  <p className={`text-base font-bold ${
                                    analysisResult.severityLevel === 0
                                      ? "text-green-700"
                                      : analysisResult.severityLevel === 1
                                      ? "text-yellow-700"
                                      : analysisResult.severityLevel === 2
                                      ? "text-orange-700"
                                      : analysisResult.severityLevel === 3
                                      ? "text-red-700"
                                      : "text-red-900"
                                  }`}>
                                    {analysisResult.confidence.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Explanation */}
                      {analysisResult.explanation && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.3 }}
                        >
                          <h3 className="text-sm font-semibold text-slate-700 mb-2">Explanation</h3>
                          <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {analysisResult.explanation}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Recommendations */}
                      {analysisResult.recommendations && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.4 }}
                        >
                          <h3 className="text-sm font-semibold text-slate-700 mb-2">Recommendations</h3>
                          <div className={`p-3 rounded-lg border-2 shadow-sm ${
                            analysisResult.result === "Anomaly"
                              ? "border-red-200 bg-gradient-to-br from-red-50 to-red-100/50"
                              : "border-green-200 bg-gradient-to-br from-green-50 to-green-100/50"
                          }`}>
                            <p className={`text-xs leading-relaxed font-medium ${
                              analysisResult.result === "Anomaly"
                                ? "text-red-800"
                                : "text-green-800"
                            }`}>
                              {analysisResult.recommendations}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-slate-200 rounded-xl">
                      <Info className="w-16 h-16 text-slate-300 mb-4" />
                      <p className="text-slate-400 text-sm text-center">Results will appear here after analysis</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>

            {/* Report Summary Section */}
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8"
                id="eye-report-summary"
              >
                <Card className="p-6 shadow-2xl rounded-2xl bg-white border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      Analysis Report Summary
                    </h2>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={generatePDFReport}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={generateTextReport}
                        className="gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Download TXT
                      </Button>
                    </div>
                  </div>

                  {/* Single Line: Date, Analyzed By, Clinical Status, Model Confidence */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {/* Report Date */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <Calendar className="w-5 h-5 text-slate-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Date</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">
                          {new Date().toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Analyzed By */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <User className="w-5 h-5 text-slate-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Analyzed By</p>
                        <p className="text-sm font-semibold text-slate-700 truncate" data-doctor-name>
                          {user?.fullName || "Dr. User"}
                        </p>
                      </div>
                    </div>

                    {/* Clinical Status */}
                    <div className={`p-3 rounded-lg border-2 ${
                      analysisResult.result === "Anomaly"
                        ? "border-red-300 bg-red-50"
                        : "border-green-300 bg-green-50"
                    }`}>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Clinical Status</p>
                      <p 
                        className={`text-sm font-bold ${
                          analysisResult.result === "Anomaly"
                            ? "text-red-800"
                            : "text-green-800"
                        }`}
                        data-clinical-status
                      >
                        {analysisResult.result === "Anomaly" ? "ANOMALY" : "NORMAL"}
                      </p>
                    </div>

                    {/* Model Confidence */}
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Model Confidence</p>
                      <p className="text-sm font-bold text-blue-800" data-model-precision>
                        {analysisResult.modelPrecision.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Clinical Interpretation */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Clinical Interpretation</h3>
                    <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border-2 border-slate-200">
                      <p className="text-sm text-slate-700 leading-relaxed mb-3" data-interpretation>
                        {analysisResult.explanation}
                      </p>
                      {analysisResult.recommendations && (
                        <div className={`mt-4 p-4 rounded-lg border-2 ${
                          analysisResult.result === "Anomaly"
                            ? "border-red-200 bg-red-50"
                            : "border-green-200 bg-green-50"
                        }`}>
                          <p className="text-xs font-semibold text-slate-700 mb-2">RECOMMENDATIONS:</p>
                          <p 
                            className={`text-sm leading-relaxed ${
                              analysisResult.result === "Anomaly"
                                ? "text-red-800 font-medium"
                                : "text-green-800"
                            }`}
                            data-recommendations
                          >
                            {analysisResult.recommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                
                  {/* Disclaimer */}
                  <div className="pt-4 border-t-2 border-slate-200">
                    <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-amber-900 mb-1">Disclaimer</p>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            This analysis is generated by an AI model and is intended for preliminary assessment only. 
                            It should not be used as a substitute for professional medical diagnosis, evaluation, or treatment. 
                            Always consult with a qualified healthcare provider for accurate diagnosis and appropriate medical care. 
                            The results provided are based on image analysis and may not account for all clinical factors.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </main>

    </div>
  );
};

export default EyeDetection;

