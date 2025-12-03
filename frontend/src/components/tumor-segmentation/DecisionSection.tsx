import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { getSeverityLevel } from "@/utils/segmentationUtils";

interface DecisionSectionProps {
    analysisData: any;
}

export default function DecisionSection({ analysisData }: DecisionSectionProps) {
    if (!analysisData) return null;

    const severity = getSeverityLevel(analysisData);
    const isHigh = severity.level === 'high';
    const isMedium = severity.level === 'medium';
    const isLow = severity.level === 'low';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
            whileHover={{ scale: 1.02 }}
        >
            <Card className="p-6 shadow-2xl rounded-2xl bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 
                border-2 border-blue-100 mt-4 backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
                <motion.h2 
                    className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    Clinical Status
                </motion.h2>
                <motion.div 
                    className={`rounded-xl p-5 border-2 shadow-lg backdrop-blur-sm ${
                        isHigh ? 'bg-gradient-to-br from-red-50 to-red-100/80 border-red-400' : 
                        isMedium ? 'bg-gradient-to-br from-orange-50 to-orange-100/80 border-orange-400' : 
                        'bg-gradient-to-br from-green-50 to-green-100/80 border-green-400'
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="flex items-start gap-4">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                        >
                            {isHigh && <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" />}
                            {isMedium && <AlertTriangle className="w-8 h-8 text-orange-600 flex-shrink-0 mt-0.5" />}
                            {isLow && <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0 mt-0.5" />}
                        </motion.div>
                        <div className="flex-1">
                            <motion.h3 
                                className={`font-bold mb-2 text-lg ${
                                    isHigh ? 'text-red-800' : 
                                    isMedium ? 'text-orange-800' : 
                                    'text-green-800'
                                }`}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                {isHigh ? 'URGENT' : isMedium ? 'NEEDS ATTENTION' : 'NOT SERIOUS'}
                            </motion.h3>
                            <motion.p 
                                className={`text-sm leading-relaxed font-medium ${
                                    isHigh ? 'text-red-700' : 
                                    isMedium ? 'text-orange-700' : 
                                    'text-green-700'
                                }`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                {severity.message}
                            </motion.p>
                        </div>
                    </div>
                </motion.div>
            </Card>
        </motion.div>
    );
}

