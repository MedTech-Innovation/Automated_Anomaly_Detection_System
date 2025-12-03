import { useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getSeverityLevel, PATIENTS, calculateModelConfidence } from "@/utils/segmentationUtils";
import PatientSelectionCard from "./tumor-segmentation/PatientSelectionCard";
import DecisionSection from "./tumor-segmentation/DecisionSection";
import BrainVisualization3D from "./tumor-segmentation/BrainVisualization3D";
import SegmentationMetrics from "./tumor-segmentation/SegmentationMetrics";
import MultiViewVisualization from "./tumor-segmentation/MultiViewVisualization";
import ClinicalReportSummary from "./tumor-segmentation/ClinicalReportSummary";

interface ScanRecord {
    id: string;
    patientId: string;
    date: string;
    timestamp: number;
    volume_cm3: number;
    confidence: number;
    hasTumor: boolean;
    analysisData?: any;
}

interface ImagePredictorProps {
    onAnalysisComplete?: (analysisData: any, confidence: number, patientId?: string) => void;
    scanHistory?: ScanRecord[];
    currentAnalysis?: {
        volume_cm3: number;
        confidence: number;
        hasTumor: boolean;
        analysisData?: any;
    } | null;
    currentPatientId?: string | null;
}

export default function ImagePredictor({ 
    onAnalysisComplete,
    scanHistory = [],
    currentAnalysis = null,
    currentPatientId = null,
}: ImagePredictorProps = {}) {
    const [patients, setPatients] = useState(PATIENTS);
    const [selectedPatient, setSelectedPatient] = useState("");
    const [modalities, setModalities] = useState([]);
    const [selectedModality, setSelectedModality] = useState("FLAIR");
    const [plane, setPlane] = useState("Axial");
    const [selectedClass, setSelectedClass] = useState("All");
    const [postProcessing, setPostProcessing] = useState(false);
    const [sliceIdx, setSliceIdx] = useState(null);
    const [predImage, setPredImage] = useState(null);
    const [patientPath, setPatientPath] = useState(null);
    const [predictionLoading, setPredictionLoading] = useState(false);
    const [gifData, setGifData] = useState(null);
    const [gifLoading, setGifLoading] = useState(false);
    const [threeViewsImage, setThreeViewsImage] = useState(null);
    const [threeViewsLoading, setThreeViewsLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [alertShown, setAlertShown] = useState(false);

    // --- Patient selection and image fetching logic ---
    const handlePatientChange = async (value: string) => {
        setSelectedPatient(value);
        try {
            const { data } = await axios.post("http://localhost:5000/patient_info", {
                patient_name: value,
            });
            setPatientPath(data.path);
            setModalities(["FLAIR", "T1", "T1c", "T2"]);
            setSelectedModality("FLAIR");

            const img = await axios.post("http://localhost:5000/get_slice", {
                patient_path: data.path,
                modality: "FLAIR",
                plane: plane,
                slice: sliceIdx ?? 50,
            });
            setPredImage("data:image/png;base64," + img.data.image);
        } catch (err) {
            setPredImage(null);
            console.error("Error fetching patient info or image:", err);
        }
    };

    // --- Update image whenever patient, modality, plane, slice, or class changes ---
    useEffect(() => {
        if (!patientPath || !selectedModality || !plane) {
            setPredImage(null);
            return;
        }
        const loadImage = async () => {
            setPredictionLoading(true);
            try {
                const res = await axios.post("http://localhost:5000/get_slice", {
                    patient_path: patientPath,
                    modality: selectedModality,
                    plane,
                    slice: sliceIdx ?? 50,
                    class: selectedClass,
                });
                if (res.data.image) {
                    setPredImage("data:image/png;base64," + res.data.image);
                } else {
                    setPredImage(null);
                    console.error("No image data in response:", res.data);
                }
            } catch (err) {
                setPredImage(null);
                console.error("Error fetching slice image:", err);
                if (err.response) {
                    console.error("Error response:", err.response.data);
                }
            } finally {
                setPredictionLoading(false);
            }
        };
        loadImage();
    }, [patientPath, selectedModality, plane, sliceIdx, selectedClass]);

    // --- Handling plane and modality changes ---
    const handlePredict = async () => {
            try {
            const payload = {
                plane,
                modality: selectedModality === "None" ? null : selectedModality,
                displayed_class: selectedClass,
                post_processing: postProcessing,
                slice_idx: sliceIdx,
            };

            const res = await axios.post("http://localhost:5000/predict", payload, { responseType: "blob" });
            setPredImage(URL.createObjectURL(res.data));
            } catch (err) {
            console.error("Prediction error:", err);
            }
        };

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const firstPath = files[0].webkitRelativePath;
        const folderName = firstPath.split("/")[0];

        setPatients((prev) => [...prev, folderName]);

        const formData = new FormData();
        for (let f of Array.from(files)) formData.append("files", f);
        formData.append("folder_name", folderName);

        try {
        await axios.post("http://localhost:5000/upload_folder", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        console.log("Folder uploaded");
        } catch (err) {
        console.error("Folder upload error:", err);
        }
    };

    // Fetch 3D GIF animation
    useEffect(() => {
        if (!patientPath || !selectedModality || !plane) {
            setGifData(null);
            return;
        }
        setGifLoading(true);
        setGifData(null);
        axios.post("http://localhost:5000/get_gif", {
                patient_path: patientPath,
                modality: selectedModality,
            plane: plane,
            class: selectedClass,
        })
        .then(res => setGifData(res.data.gif))
        .catch(err => {
            setGifData(null);
            console.error("Error fetching GIF:", err);
        })
        .finally(() => setGifLoading(false));
    }, [patientPath, selectedModality, plane, selectedClass]);

    // Fetch combined three-view visualization (fixed coordinates)
    useEffect(() => {
        if (!patientPath) {
            setThreeViewsImage(null);
            return;
        }

        const payload = {
            patient_path: patientPath,
            x: -92,
            y: 114,
            z: 61,
            class: selectedClass,
        };

        setThreeViewsLoading(true);
        setThreeViewsImage(null);
        axios.post("http://localhost:5000/get_three_views", payload)
            .then(res => {
                if (res.data && res.data.image) {
                    setThreeViewsImage("data:image/png;base64," + res.data.image);
                } else {
                    setThreeViewsImage(null);
                    console.error("No image data in three-view response", res.data);
                }
            })
            .catch(err => {
                setThreeViewsImage(null);
                console.error("Error fetching three-view visualization:", err);
                if (err.response) {
                    console.error("Error response:", err.response.data);
                }
            })
            .finally(() => setThreeViewsLoading(false));
    }, [patientPath, selectedClass]);

    // Fetch analysis metrics and explanations
    useEffect(() => {
        if (!patientPath) {
            setAnalysisData(null);
            setAlertShown(false);
            return;
        }

        setAnalysisLoading(true);
        setAnalysisData(null);
        setAlertShown(false);
        axios.post("http://localhost:5000/get_analysis", {
            patient_path: patientPath,
            class: selectedClass,
        })
            .then(res => {
                if (res.data) {
                    setAnalysisData(res.data);
                    // Calculate confidence and notify parent component
                    const confidence = calculateModelConfidence(res.data);
                    if (onAnalysisComplete) {
                        onAnalysisComplete(res.data, confidence, selectedPatient);
                    }
                } else {
                    setAnalysisData(null);
                    console.error("No analysis data in response", res.data);
                }
            })
            .catch(err => {
                setAnalysisData(null);
                console.error("Error fetching analysis:", err);
                if (err.response) {
                    console.error("Error response:", err.response.data);
                }
            })
            .finally(() => setAnalysisLoading(false));
    }, [patientPath, selectedClass, onAnalysisComplete]);

    // Show alert for urgent cases
    useEffect(() => {
        if (analysisData && !alertShown) {
            const severity = getSeverityLevel(analysisData);
            if (severity.level === 'high') {
                toast.error("URGENT ALERT", {
                    description: severity.message,
                    duration: 10000,
                    action: {
                        label: "Dismiss",
                        onClick: () => {},
                    },
                });
                setAlertShown(true);
            }
        }
    }, [analysisData, alertShown]);

return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex flex-row gap-8 w-full mt-6 min-h-[32rem] h-full items-stretch">
                {/* Column 1 */}
                <motion.div
                    initial={{ opacity: 0, x: -60, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.65, delay: 0.1, type: "spring", stiffness: 100 }}
                    className="flex-1 flex flex-col h-full min-h-[28rem] justify-stretch"
                >
                    <PatientSelectionCard
                        selectedPatient={selectedPatient}
                        plane={plane}
                        selectedModality={selectedModality}
                        selectedClass={selectedClass}
                        patients={patients}
                        onPatientChange={handlePatientChange}
                        onPlaneChange={setPlane}
                        onModalityChange={setSelectedModality}
                        onClassChange={setSelectedClass}
                        onPredict={handlePredict}
                        onPatientAdded={(newPatient) => {
                            setPatients((prev) => {
                                if (!prev.includes(newPatient)) {
                                    return [...prev, newPatient];
                                }
                                return prev;
                            });
                        }}
                    />

                    <DecisionSection analysisData={analysisData} />
                </motion.div>

                {/* Main right column: 2 rows (top: 2 columns, bottom: analysis) */}
                <motion.div 
                    className="flex-[2] flex flex-col min-h-[28rem] gap-7 justify-stretch h-full"
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, delay: 0.2, type: "spring", stiffness: 100 }}
                >
                    {/* First row: 3D animation + prediction */}
                    <div className="flex flex-row gap-8 flex-1 min-h-[16rem] h-1/2 items-stretch">
                        <BrainVisualization3D 
                            gifData={gifData} 
                            gifLoading={gifLoading} 
                        />
                        <SegmentationMetrics 
                            analysisData={analysisData}
                            analysisLoading={analysisLoading}
                            selectedClass={selectedClass}
                        />
            </div>
                    {/* Second row: multi-view visualization */}
                    <MultiViewVisualization 
                        threeViewsImage={threeViewsImage}
                        threeViewsLoading={threeViewsLoading}
                    />
                </motion.div>
            </div>

            {/* Clinical Report Summary */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-8"
            >
                <ClinicalReportSummary
                    analysisData={analysisData}
                    selectedPatient={selectedPatient}
                    selectedModality={selectedModality}
                    selectedClass={selectedClass}
                    threeViewsImage={threeViewsImage}
                />
            </motion.div>
        </motion.div>
    );
}
