import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface MultiViewVisualizationProps {
    threeViewsImage: string | null;
    threeViewsLoading: boolean;
}

export default function MultiViewVisualization({ 
    threeViewsImage, 
    threeViewsLoading 
}: MultiViewVisualizationProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.45, type: "spring", stiffness: 100 }}
            className="w-full flex-1"
            whileHover={{ scale: 1.01 }}
        >
            <Card className="rounded-2xl shadow-2xl p-6 bg-gradient-to-br from-white via-indigo-50/30 to-blue-50/20 
                border-2 border-indigo-200 flex flex-col h-full justify-center items-center 
                backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
                <motion.h3 
                    className="text-lg font-bold mb-4 bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    Multi-view Tumor Localisation
                </motion.h3>
                {threeViewsLoading ? (
                    <motion.div 
                        className="w-full h-[320px] flex justify-center items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.div 
                            className="relative"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                        </motion.div>
                    </motion.div>
                ) : threeViewsImage ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="relative group w-full"
                    >
                        <img
                            src={threeViewsImage}
                            alt="Multi-view Prediction"
                            className="rounded-xl w-full border-2 border-indigo-200 shadow-2xl object-contain 
                                group-hover:border-indigo-400 transition-all duration-300"
                            style={{
                                background: '#000000',
                                minHeight: '260px',
                                maxHeight: '420px',
                            }}
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-indigo-500/0 to-indigo-500/0 
                            group-hover:from-indigo-500/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
                    </motion.div>
                ) : (
                    <motion.span 
                        className="text-slate-500 font-medium"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        No multi-view visualization yet.
                    </motion.span>
                )}
            </Card>
        </motion.div>
    );
}

