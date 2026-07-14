import { Mail, MessageSquare, Video, Phone, MapPin, type LucideIcon } from "lucide-react";
import type { CommType } from "../data/types";

export const COMM_ICONS: Record<CommType, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  webinar: Video,
  call: Phone,
  event: MapPin,
};

// Categorical colour per comm type. Team stays encoded by swimlane.
// `accent` is the solid fill used for the card's date-anchor edge.
export const COMM_COLORS: Record<
  CommType,
  { chip: string; text: string; border: string; accent: string }
> = {
  email: { chip: "bg-tint-blue", text: "text-rmit-blue", border: "border-rmit-blue/30", accent: "bg-rmit-blue" },
  sms: { chip: "bg-tint-teal", text: "text-teal", border: "border-teal/30", accent: "bg-teal" },
  webinar: { chip: "bg-tint-purple", text: "text-purple", border: "border-purple/30", accent: "bg-purple" },
  call: { chip: "bg-tint-indigo", text: "text-indigo", border: "border-indigo/30", accent: "bg-indigo" },
  event: { chip: "bg-tint-pink", text: "text-pink", border: "border-pink/30", accent: "bg-pink" },
};

export const COMM_LABELS: Record<CommType, string> = {
  email: "Email",
  sms: "SMS",
  webinar: "Webinar",
  call: "Call",
  event: "In-person event",
};

// Channel icons (brand logos + generic fallbacks) live in ChannelIcon.tsx.
