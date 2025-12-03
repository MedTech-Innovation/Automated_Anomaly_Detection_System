import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface BrainVisualization3DProps {
    gifData: string | null;
    gifLoading: boolean;
}

export default function BrainVisualization3D({ gifData, gifLoading }: BrainVisualization3DProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
            className="flex-1 flex flex-col h-full min-h-[14rem] justify-center items-stretch"
            whileHover={{ scale: 1.02 }}
        >
            <Card className="rounded-2xl shadow-2xl p-6 flex flex-col flex-1 items-center 
                bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 border-2 border-blue-100 
                h-full min-h-[14rem] justify-center backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
                <motion.h3 
                    className="text-lg font-bold mb-4 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    3D Brain MRI Visualization
                </motion.h3>
                {gifLoading && (
                    <motion.div 
                        className="w-[340px] h-[220px] flex justify-center items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.div 
                            className="relative"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600" />
                        </motion.div>
                    </motion.div>
                )}
                {!gifLoading && gifData && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="relative group"
                    >
                        <img
                            src={`data:image/gif;base64,${gifData}`}
                            alt="3D Tumor GIF"
                            className="rounded-xl w-full max-w-[340px] max-h-[360px] border-2 border-blue-200 
                                shadow-2xl object-contain flex-1 group-hover:border-blue-400 transition-all duration-300"
                            style={{ background: "#000000", objectFit: "contain", minHeight: "350px", height: "100%" }}
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-blue-500/0 to-blue-500/0 
                            group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
                    </motion.div>
                )}
                {!gifLoading && !gifData && (
                    <motion.span 
                        className="text-slate-500 font-medium"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        No animation available.
                    </motion.span>
                )}
            </Card>
        </motion.div>
    );
}

