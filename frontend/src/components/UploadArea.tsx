import { useCallback, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface UploadAreaProps {
  onImageUpload: (file: File) => void;
  uploadedImage: string | null;
}

const UploadArea = ({ onImageUpload, uploadedImage }: UploadAreaProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const isValidMedicalImage = (file: File) => {
    const validExtensions = ['.nii', '.nii.gz', '.hdr', '.img'];
    const fileName = file.name.toLowerCase();
    
    // Check for 3D medical imaging formats
    if (validExtensions.some(ext => fileName.endsWith(ext))) {
      return true;
    }
    
    // Check for standard image formats
    if (file.type.startsWith("image/")) {
      return true;
    }
    
    return false;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && isValidMedicalImage(file)) {
        onImageUpload(file);
      }
    },
    [onImageUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isValidMedicalImage(file)) {
        onImageUpload(file);
      }
    },
    [onImageUpload]
  );

  return (
    <Card className="p-6 mt-5">
      <h2 className="text-xl font-semibold mb-4 text-foreground">Upload Image</h2>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50"
          }
        `}
      >
        <input
          type="file"
          accept="image/*,.nii,.nii.gz,.hdr,.img"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="file-upload"
        />
        
        {uploadedImage ? (
          <div className="space-y-3">
            <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden border border-border">
              <img
                src={uploadedImage}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Image uploaded successfully. Drop another to replace.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-foreground font-medium">
                Drag and drop your image here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse files
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <span>Supports: JPG, PNG, WEBP, NII, NII.GZ, HDR/IMG</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default UploadArea;
