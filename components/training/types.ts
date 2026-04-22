export type TrainingFileType = "pdf" | "doc" | "ppt" | "image" | "video" | "other";
export type TrainingStatus = "pending" | "approved" | "rejected";

export interface TrainingMaterial {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  fileUrl: string;
  fileType: TrainingFileType;
  status: TrainingStatus;
  uploadedBy: { _id: string; name: string; role: string; email?: string } | null;
  approvedBy?: { _id: string; name: string } | null;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export const FILE_TYPE_LABELS: Record<TrainingFileType, string> = {
  pdf:   "PDF",
  doc:   "Document",
  ppt:   "Presentation",
  image: "Image",
  video: "Video",
  other: "File",
};

export const FILE_TYPE_ICONS: Record<TrainingFileType, string> = {
  pdf:   "📄",
  doc:   "📝",
  ppt:   "📊",
  image: "🖼️",
  video: "🎬",
  other: "📎",
};
