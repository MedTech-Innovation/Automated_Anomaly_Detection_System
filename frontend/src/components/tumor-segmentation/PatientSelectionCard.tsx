import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PATIENTS } from "@/utils/segmentationUtils";
import { motion } from "framer-motion";
import { FolderPlus } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import axios from "axios";

interface PatientSelectionCardProps {
    selectedPatient: string;
    plane: string;
    selectedModality: string;
    selectedClass: string;
    patients: string[];
    onPatientChange: (value: string) => void;
    onPlaneChange: (value: string) => void;
    onModalityChange: (value: string) => void;
    onClassChange: (value: string) => void;
    onPredict: () => void;
    onPatientAdded?: (newPatient: string) => void;
}

export default function PatientSelectionCard({
    selectedPatient,
    plane,
    selectedModality,
    selectedClass,
    patients,
    onPatientChange,
    onPlaneChange,
    onModalityChange,
    onClassChange,
    onPredict,
    onPatientAdded,
}: PatientSelectionCardProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            return;
        }

        // Get folder name from first file's path
        const firstPath = files[0].webkitRelativePath || files[0].name;
        const folderName = firstPath.split("/")[0];

        if (!folderName) {
            toast.error("Invalid folder structure", {
                description: "Please select a folder containing patient data files.",
            });
            return;
        }

        // Check if patient already exists
        if (patients.includes(folderName)) {
            toast.warning("Patient already exists", {
                description: `Patient "${folderName}" is already in the list.`,
            });
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            for (let f of Array.from(files)) {
                formData.append("files", f);
            }
            formData.append("folder_name", folderName);

            await axios.post("http://localhost:5000/upload_folder", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Patient folder uploaded successfully", {
                description: `"${folderName}" has been added to the patient list.`,
            });

            // Notify parent component to add patient to list
            if (onPatientAdded) {
                onPatientAdded(folderName);
            }

            // Automatically select the newly uploaded patient
            onPatientChange(folderName);
        } catch (err: any) {
            console.error("Folder upload error:", err);
            toast.error("Upload failed", {
                description: err.response?.data?.error || err.message || "Failed to upload patient folder. Please try again.",
            });
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            whileHover={{ scale: 1.01 }}
        >
            <Card className="p-6 shadow-2xl rounded-2xl bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 
                border-2 border-blue-100 flex flex-col flex-1 h-full min-h-[28rem] justify-between 
                backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
                <motion.h2 
                    className="text-lg font-semibold text-slate-700 pb-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Patient Selection
                </motion.h2>
            <CardContent className="space-y-4 p-2 flex flex-col gap-6 flex-1 justify-between">
                <motion.div 
                    className="flex-1 min-w-[200px]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Label className="text-slate-700 font-semibold">Patient</Label>
                    <div className="flex gap-2">
                        <Select onValueChange={onPatientChange} value={selectedPatient}>
                            <SelectTrigger className="mt-2 border-2 border-slate-200 hover:border-blue-400 
                                transition-colors duration-300 shadow-sm hover:shadow-md flex-1">
                                <SelectValue placeholder="Select a patient" />
                            </SelectTrigger>
                            <SelectContent>
                                {patients.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            className="mt-2 border-2 border-slate-200 hover:border-blue-400 
                                transition-colors duration-300 shadow-sm hover:shadow-md"
                            title="Upload new patient folder"
                        >
                            {isUploading ? (
                                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <FolderPlus className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        webkitdirectory=""
                        directory=""
                        multiple
                        onChange={handleFolderUpload}
                        className="hidden"
                        accept=".nii,.nii.gz,.hdr,.img"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Click the folder icon to upload a new patient folder
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Label className="text-slate-700 font-semibold">Plane</Label>
                    <Select onValueChange={onPlaneChange} defaultValue={plane}>
                        <SelectTrigger className="mt-2 border-2 border-slate-200 hover:border-blue-400 
                            transition-colors duration-300 shadow-sm hover:shadow-md">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Axial">Axial</SelectItem>
                            <SelectItem value="Coronal">Coronal</SelectItem>
                            <SelectItem value="Sagittal">Sagittal</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Label className="text-slate-700 font-semibold">Modality</Label>
                    <Select onValueChange={onModalityChange} defaultValue="FLAIR">
                        <SelectTrigger className="mt-2 border-2 border-slate-200 hover:border-blue-400 
                            transition-colors duration-300 shadow-sm hover:shadow-md">
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FLAIR">FLAIR</SelectItem>
                            <SelectItem value="T1">T1</SelectItem>
                            <SelectItem value="T1c">T1c</SelectItem>
                            <SelectItem value="T2">T2</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <Label className="text-slate-700 font-semibold">Class</Label>
                    <Select onValueChange={onClassChange} defaultValue={selectedClass}>
                        <SelectTrigger className="mt-2 border-2 border-slate-200 hover:border-blue-400 
                            transition-colors duration-300 shadow-sm hover:shadow-md">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="1">1 - Non-Enhancing Tumor</SelectItem>
                            <SelectItem value="2">2 - Peritumoral Edema</SelectItem>
                            <SelectItem value="3">3 - Enhancing Tumor</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>

            </CardContent>
        </Card>
        </motion.div>
    );
}

