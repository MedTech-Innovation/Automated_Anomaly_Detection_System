// Class color map matching backend segmentation colors
export const CLASS_COLOR_MAP: { [key: string]: string } = {
    "1": "#f6a9c4",  // Non-enhancing tumor (pink)
    "2": "#c58b57",  // Edema (brown)
    "3": "#8abed8",  // Enhancing tumor (light blue)
};

// Patient list (static fallback)
export const PATIENTS = [
    "Random patient", "BraTS20_Training_009", "BraTS20_Training_325",
    "BraTS20_Training_335", "BraTS20_Training_356"
];

// Helper function to determine if text should be dark or light based on background
export const getTextColor = (bgColor: string): string => {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'text-slate-800' : 'text-white';
};

// Calculate model confidence based on segmentation metrics
export const calculateModelConfidence = (analysisData: any): number => {
    if (!analysisData?.metrics?.total_tumor) {
        return 75;
    }

    const totalVolume = analysisData.metrics.total_tumor.volume_cm3;
    const percentage = analysisData.metrics.total_tumor.percentage;
    
    let confidence = 85;
    
    if (totalVolume > 20) confidence += 5;
    if (totalVolume > 50) confidence += 3;
    if (percentage > 2) confidence += 3;
    if (percentage > 5) confidence += 2;
    
    if (analysisData.metrics.by_class) {
        const activeClasses = Object.keys(analysisData.metrics.by_class).filter(
            (classId) => analysisData.metrics.by_class[classId].voxel_count > 0
        ).length;
        if (activeClasses >= 2) confidence += 2;
    }
    
    return Math.min(confidence, 98);
};

// Determine severity level based on tumor metrics
export const getSeverityLevel = (analysisData: any): { level: 'low' | 'medium' | 'high', message: string } => {
    if (!analysisData?.metrics?.total_tumor) {
        return { level: 'low', message: 'No tumor detected. Patient appears healthy.' };
    }

    const totalVolume = analysisData.metrics.total_tumor.volume_cm3;
    const percentage = analysisData.metrics.total_tumor.percentage;

    // Urgent: Large tumor volume (>50 cm³) or high percentage (>5%)
    if (totalVolume > 50 || percentage > 5) {
        return {
            level: 'high',
            message: 'URGENT: Large tumor detected. Immediate medical attention required. Consider urgent surgical consultation.'
        };
    }

    // Need attention: Medium tumor volume (10-50 cm³) or moderate percentage (1-5%)
    if (totalVolume > 10 || percentage > 1) {
        return {
            level: 'medium',
            message: 'Attention needed: Moderate tumor size detected. Schedule follow-up consultation and consider treatment planning.'
        };
    }

    // Not serious: Small tumor volume (<10 cm³) and low percentage (<1%)
    return {
        level: 'low',
        message: 'Low risk: Small tumor detected. Regular monitoring recommended. Continue routine follow-ups.'
    };
};

