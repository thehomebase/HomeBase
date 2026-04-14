export interface PhotoItem {
  id: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
  order: number;
  motionType: string;
  caption: string;
  keyword?: string;
  roomType?: string;
  focusPoint?: { x: number; y: number };
  videoClipUrl?: string;
}

export interface VideoSettings {
  aspectRatio: string;
  musicTrack: string;
  transitionDuration: number;
  photoDuration: number;
  showCaptions: boolean;
  brandingPosition: string;
  transitionStyle: string;
  textTemplate: string;
}

export interface PropertyDetails {
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  description?: string;
}

export interface AgentBranding {
  showName: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showBrokerage: boolean;
  showClosingSlide: boolean;
  showAgentPhoto: boolean;
  showBrokerageLogo: boolean;
  name: string;
  email: string;
  phone: string;
  brokerageName: string;
  roleText: string;
  agentPhotoUrl: string;
  brokerageLogoUrl: string;
}

export interface ListingVideoProps {
  photos: PhotoItem[];
  settings: VideoSettings;
  propertyDetails: PropertyDetails;
  propertyAddress: string;
  agentBranding: AgentBranding;
}

export const ASPECT_RATIOS: Record<string, { width: number; height: number; label: string }> = {
  "16:9": { width: 1920, height: 1080, label: "Landscape (16:9)" },
  "9:16": { width: 1080, height: 1920, label: "Portrait / Reels (9:16)" },
  "1:1": { width: 1080, height: 1080, label: "Square (1:1)" },
};
