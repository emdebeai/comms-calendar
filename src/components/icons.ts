import {
  Mail,
  MessageSquare,
  Video,
  Phone,
  MapPin,
  Share2,
  Search,
  Megaphone,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Campaign, CommType } from "../data/types";

export const COMM_ICONS: Record<CommType, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  webinar: Video,
  call: Phone,
  event: MapPin,
};

// Categorical colour per comm type. Team stays encoded by swimlane.
export const COMM_COLORS: Record<
  CommType,
  { chip: string; text: string; border: string }
> = {
  email: { chip: "bg-tint-blue", text: "text-rmit-blue", border: "border-rmit-blue/30" },
  sms: { chip: "bg-tint-teal", text: "text-teal", border: "border-teal/30" },
  webinar: { chip: "bg-tint-purple", text: "text-purple", border: "border-purple/30" },
  call: { chip: "bg-tint-indigo", text: "text-indigo", border: "border-indigo/30" },
  event: { chip: "bg-tint-pink", text: "text-pink", border: "border-pink/30" },
};

export const COMM_LABELS: Record<CommType, string> = {
  email: "Email",
  sms: "SMS",
  webinar: "Webinar",
  call: "Call",
  event: "In-person event",
};

export const CHANNEL_ICONS: Record<Campaign["channel"], LucideIcon> = {
  social: Share2,
  video: Video,
  search: Search,
  burst: Megaphone,
  retargeting: Target,
};
