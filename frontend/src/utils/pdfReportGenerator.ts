import jsPDF from "jspdf";

interface PDFReportData {
  // Report metadata
  reportType: "Eye" | "Lung" | "Skin";
  reportTitle: string;
  doctorName: string;
  doctorEmail?: string;
  reportDate: string;
  reportId: string;
  fileNumber?: string;
  
  // Images
  originalImage?: string; // base64 or data URL
  heatmapImage?: string; // base64 or data URL
  
  // Analysis results
  clinicalStatus: string;
  confidence: number;
  modelPrecision: number;
  conditionType?: string;
  severityLevel?: number; // For eye detection (0-4)
  explanation?: string;
  recommendations?: string;
  top3Predictions?: Array<{
    class: string;
    confidence: number;
    result_type: string;
  }>;
  allPredictions?: { [key: string]: number };
}

/**
 * Generate a comprehensive PDF report for medical image analysis
 * Uses the same professional template as tumor detection
 */
export const generateMedicalPDFReport = async (data: PDFReportData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Header with logo area
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MEDTECH INNOVATION", margin, 20);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(data.reportTitle, margin, 30);
  
  yPos = 50;

  // Report Information Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Report Information", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Report Date: ${data.reportDate}`, margin, yPos);
  yPos += 6;
  
  if (data.fileNumber) {
    doc.text(`File Number: ${data.fileNumber}`, margin, yPos);
    yPos += 6;
  }
  
  doc.text(`Report ID: ${data.reportId}`, margin, yPos);
  yPos += 6;
  doc.text(`Doctor Name: ${data.doctorName}`, margin, yPos);
  yPos += 6;
  
  if (data.doctorEmail) {
    doc.text(`Doctor Email: ${data.doctorEmail}`, margin, yPos);
    yPos += 6;
  }
  
  yPos += 6;

  // Clinical Status Box
  const statusColor = data.clinicalStatus === "Malign" || data.clinicalStatus === "Anomaly" || data.clinicalStatus === "Pneumonia" 
    ? [220, 38, 38]  // Red for urgent
    : data.clinicalStatus === "Benign"
    ? [249, 115, 22]  // Orange for attention
    : [34, 197, 94];  // Green for normal
  
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 15, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const statusText = data.clinicalStatus.toUpperCase();
  doc.text(statusText, margin + 5, yPos + 10);
  yPos += 20;

  // Images Section
  if (data.originalImage || data.heatmapImage) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Analysis Images", margin, yPos);
    yPos += 10;

    const imageWidth = (pageWidth - 3 * margin) / 2;
    const imageHeight = 60;

    // Original Image
    if (data.originalImage) {
      try {
        doc.addImage(data.originalImage, 'JPEG', margin, yPos, imageWidth, imageHeight);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Original Image", margin + imageWidth / 2, yPos + imageHeight + 5, { align: 'center' });
      } catch (error) {
        console.error("Error adding original image to PDF:", error);
      }
    }

    // Heatmap Image
    if (data.heatmapImage) {
      try {
        const heatmapX = data.originalImage ? margin + imageWidth + margin : margin;
        doc.addImage(data.heatmapImage, 'JPEG', heatmapX, yPos, imageWidth, imageHeight);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Heatmap Analysis", heatmapX + imageWidth / 2, yPos + imageHeight + 5, { align: 'center' });
      } catch (error) {
        console.error("Error adding heatmap image to PDF:", error);
      }
    }

    yPos += imageHeight + 15;
  }

  // Analysis Results Section
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Analysis Results", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Detection Confidence: ${data.confidence.toFixed(2)}%`, margin, yPos);
  yPos += 6;
  doc.text(`Model Precision: ${data.modelPrecision.toFixed(2)}%`, margin, yPos);
  yPos += 6;
  
  if (data.conditionType) {
    doc.text(`Condition Type: ${data.conditionType}`, margin, yPos);
    yPos += 6;
  }
  
  if (data.severityLevel !== undefined) {
    const severityLabels = ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"];
    doc.text(`Severity Level: ${data.severityLevel} - ${severityLabels[data.severityLevel] || "Unknown"}`, margin, yPos);
    yPos += 6;
  }
  
  yPos += 6;

  // Top Predictions (if available)
  if (data.top3Predictions && data.top3Predictions.length > 0) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Top Predictions", margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.top3Predictions.forEach((pred, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(`${index + 1}. ${pred.class}: ${pred.confidence.toFixed(2)}% (${pred.result_type})`, margin + 5, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  // Clinical Interpretation
  if (data.explanation) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Clinical Interpretation", margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const explanationLines = doc.splitTextToSize(data.explanation, pageWidth - 2 * margin);
    explanationLines.forEach((line: string) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  // Recommendations
  if (data.recommendations) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendations", margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const recommendationLines = doc.splitTextToSize(data.recommendations, pageWidth - 2 * margin);
    recommendationLines.forEach((line: string) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  // All Predictions (if available and different from top3)
  if (data.allPredictions && Object.keys(data.allPredictions).length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("All Predictions", margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    Object.entries(data.allPredictions)
      .sort(([, a], [, b]) => b - a)
      .forEach(([className, confidence]) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(`${className}: ${confidence.toFixed(2)}%`, margin + 5, yPos);
        yPos += 5;
      });
    yPos += 5;
  }

  // Disclaimer
  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const disclaimer = "This AI-assisted analysis is designed to support clinical decision-making and should not replace professional medical judgment. Always consider complete patient history, physical examination, and additional diagnostic tests when making clinical decisions. Consult with appropriate specialists for definitive diagnosis and treatment planning.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin - 10);
  disclaimerLines.forEach((line: string, index: number) => {
    doc.text(line, margin + 5, yPos + 8 + (index * 4));
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} - Generated by MedTech Innovation`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc;
};

/**
 * Convert image URL to base64 for PDF inclusion
 * Handles both data URLs (already base64) and regular URLs
 */
export const imageToBase64 = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If already a data URL, return as is
    if (imageUrl.startsWith('data:')) {
      resolve(imageUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(new Error('Failed to load image'));
    };
    img.src = imageUrl;
  });
};

