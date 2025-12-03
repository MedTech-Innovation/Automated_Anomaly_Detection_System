import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CLASS_COLOR_MAP, getTextColor } from "@/utils/segmentationUtils";

interface SegmentationMetricsProps {
    analysisData: any;
    analysisLoading: boolean;
    selectedClass: string;
}

export default function SegmentationMetrics({ 
    analysisData, 
    analysisLoading, 
    selectedClass 
}: SegmentationMetricsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, type: "spring", stiffness: 100 }}
            className="flex-1 flex flex-col h-full min-h-[14rem]"
            whileHover={{ scale: 1.02 }}
        >
            <Card className="rounded-2xl shadow-2xl p-4 mt-0 bg-gradient-to-br from-white via-indigo-50/80 to-blue-100/80 
                border-2 border-indigo-200 flex-1 flex flex-col h-full justify-center overflow-y-auto 
                backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
                <motion.h3 
                    className="text-lg font-bold mb-4 bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    Model Segmentation Prediction
                </motion.h3>
                {analysisLoading ? (
                    <div className="w-full h-[220px] flex justify-center items-center">
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    </div>
                ) : analysisData ? (
                    <motion.div 
                        className="space-y-4 text-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        {analysisData.metrics && (
                            <motion.div 
                                className="bg-white/90 rounded-xl p-4 shadow-lg border-2 border-indigo-200/50 
                                    backdrop-blur-sm hover:shadow-xl transition-all duration-300"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                {selectedClass === "All" ? (
                                    <>
                                        {analysisData.metrics.total_tumor && (
                                            <div className="mb-3 pb-3 border-b border-indigo-100">
                                                <p className="text-xs font-semibold text-slate-600 mb-1">Total Tumor Volume</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-slate-500">Volume:</span>
                                                        <span className="ml-2 font-semibold text-indigo-700">{analysisData.metrics.total_tumor.volume_cm3} cm³</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">Voxels:</span>
                                                        <span className="ml-2 font-semibold text-indigo-700">{analysisData.metrics.total_tumor.voxel_count.toLocaleString()}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-slate-500">Percentage of brain:</span>
                                                        <span className="ml-2 font-semibold text-indigo-700">{analysisData.metrics.total_tumor.percentage}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {analysisData.metrics.by_class && (
                                            <div>
                                                <p className="text-xs font-semibold text-slate-600 mb-2">Class Breakdown</p>
                                                <div className="space-y-2">
                                                    {Object.entries(analysisData.metrics.by_class)
                                                        .sort(([, a]: [string, any], [, b]: [string, any]) => b.percentage - a.percentage)
                                                        .map(([classId, metrics]: [string, any], index: number) => {
                                                            const classColor = CLASS_COLOR_MAP[classId] || "#e5e7eb";
                                                            const textColor = getTextColor(classColor);
                                                            return (
                                                                <motion.div 
                                                                    key={classId} 
                                                                    className="rounded-lg p-3 shadow-md border-2 border-opacity-30 
                                                                        hover:shadow-lg transition-all duration-300 hover:scale-105"
                                                                    style={{ 
                                                                        backgroundColor: classColor,
                                                                        borderColor: classColor
                                                                    }}
                                                                    initial={{ opacity: 0, x: -20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: 0.8 + index * 0.1 }}
                                                                >
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className={`font-semibold ${textColor}`}>
                                                                            Class {classId}: {classId === "1" ? "Non-Enhancing" : classId === "2" ? "Edema" : "Enhancing"}
                                                                        </span>
                                                                        <span className={`${textColor} font-semibold`}>{metrics.volume_cm3} cm³</span>
                                                                    </div>
                                                                    <div className={`${textColor} text-xs opacity-90`}>
                                                                        {metrics.voxel_count.toLocaleString()} voxels ({metrics.percentage}%)
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    selectedClass in CLASS_COLOR_MAP && analysisData.metrics.selected_class_metrics && (
                                        <motion.div 
                                            className="rounded-xl p-4 shadow-lg border-2 border-opacity-30 hover:shadow-xl 
                                                transition-all duration-300"
                                            style={{ backgroundColor: CLASS_COLOR_MAP[selectedClass] }}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.7 }}
                                        >
                                            <p className={`text-sm font-semibold mb-3 ${getTextColor(CLASS_COLOR_MAP[selectedClass])}`}>
                                                Class {selectedClass}: {selectedClass === "1" ? "Non-Enhancing Tumor" : selectedClass === "2" ? "Peritumoral Edema" : "Enhancing Tumor"}
                                            </p>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className={getTextColor(CLASS_COLOR_MAP[selectedClass]) + " opacity-90"}>Volume:</span>
                                                    <span className={`font-semibold ${getTextColor(CLASS_COLOR_MAP[selectedClass])}`}>
                                                        {analysisData.metrics.selected_class_metrics.volume_cm3} cm³
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className={getTextColor(CLASS_COLOR_MAP[selectedClass]) + " opacity-90"}>Voxels:</span>
                                                    <span className={`font-semibold ${getTextColor(CLASS_COLOR_MAP[selectedClass])}`}>
                                                        {analysisData.metrics.selected_class_metrics.voxel_count.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className={getTextColor(CLASS_COLOR_MAP[selectedClass]) + " opacity-90"}>Percentage of brain:</span>
                                                    <span className={`font-semibold ${getTextColor(CLASS_COLOR_MAP[selectedClass])}`}>
                                                        {analysisData.metrics.selected_class_metrics.percentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.span 
                        className="text-slate-500 text-sm font-medium"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        No analysis data available.
                    </motion.span>
                )}
            </Card>
        </motion.div>
    );
}

