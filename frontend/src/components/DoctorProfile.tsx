import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, LogOut, Image as ImageIcon, Stethoscope } from "lucide-react";

interface ScannedImage {
  id: string;
  imageUrl: string;
  result: "Normal" | "Anomaly";
  confidence: number;
  date: string;
}

interface DoctorProfileProps {
  doctorName: string;
  email: string;
  speciality?: string;
  scannedImages: ScannedImage[];
  onLogout: () => void;
}

/**
 * Doctor Profile Component
 * 
 * Displays doctor's profile information and their scanned image history.
 * Currently uses mock data stored in local state.
 * 
 * Features:
 * - Profile information (name, email)
 * - List of all scanned images with results
 * - Logout functionality
 */
const DoctorProfile = ({ 
  doctorName, 
  email, 
  speciality, 
  scannedImages, 
  onLogout,
}: DoctorProfileProps) => {
  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Doctor Profile</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium text-foreground">Dr. {doctorName}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{email}</p>
            </div>
          </div>

          {/* Speciality */}
          {speciality && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Speciality</p>
                <p className="font-medium text-foreground">{speciality}</p>
              </div>
            </div>
          )}

          {/* Member Since */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium text-foreground">January 2025</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Scanned Images History */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Scanned Images</h2>
          <Badge variant="secondary" className="ml-2">
            {scannedImages.length} total
          </Badge>
        </div>

        {scannedImages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No scanned images yet</p>
            <p className="text-sm">Upload an image to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scannedImages.map((scan) => (
              <div
                key={scan.id}
                className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <img
                      src={scan.imageUrl}
                      alt="Scanned image"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={scan.result === "Anomaly" ? "destructive" : "default"}
                        className={
                          scan.result === "Anomaly"
                            ? "bg-warning text-warning-foreground"
                            : "bg-success text-success-foreground"
                        }
                      >
                        {scan.result}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {scan.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scanned on {scan.date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DoctorProfile;
