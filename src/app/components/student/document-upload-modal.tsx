import { useState } from "react";
import { X, Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (fileName: string) => void;
  title: string;
  description: string;
  allowedTypes?: string[];
  maxSizeMB?: number;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  allowedTypes = [".pdf", ".doc", ".docx"],
  maxSizeMB = 10,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB > maxSizeMB) {
        toast.error(`File size exceeds the ${maxSizeMB}MB limit.`);
        return;
      }

      // Basic file extension verification
      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (allowedTypes.length > 0 && !allowedTypes.includes(fileExtension) && !allowedTypes.some(type => file.type.includes(type.replace(".", "")))) {
        toast.error(`Invalid file type. Allowed formats: ${allowedTypes.join(", ")}`);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            toast.success(`${selectedFile.name} uploaded successfully!`);
            onSuccess(selectedFile.name);
            setSelectedFile(null);
            onClose();
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground text-xs mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!isUploading ? (
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors">
              <label className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {selectedFile ? selectedFile.name : "Click to select file or drag & drop"}
                </span>
                {selectedFile ? (
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Supported formats: {allowedTypes.join(", ")} (Max {maxSizeMB}MB)
                  </span>
                )}
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept={allowedTypes.join(",")}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{selectedFile?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Uploading...</p>
                </div>
                <span className="text-sm font-semibold text-primary">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-100 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3 justify-end bg-muted/20">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 border border-border rounded-lg hover:bg-accent font-medium text-sm text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium text-sm transition-opacity flex items-center gap-1.5"
          >
            {isUploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </div>
    </div>
  );
}
