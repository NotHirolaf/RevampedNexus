import type { LucideIcon } from "lucide-react";

export type ModuleCategory =
  | "academics"
  | "productivity"
  | "scheduling"
  | "social"
  | "reference";

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: ModuleCategory;
  defaultEnabled: boolean;
  route: string;
}

export type GpaScale = "4.0" | "4.3" | "percentage" | "custom";

export interface UserProfile {
  displayName: string;
  university: string;
  semester: string;
  gpaScale: GpaScale;
  customGpaMax: number | null;
}

export type AccentColor =
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "pink"
  | "teal"
  | "red"
  | "amber";

export interface ExportData {
  version: string;
  timestamp: string;
  modules: Record<string, boolean>;
  profile: UserProfile;
  onboarding: { completed: boolean };
  theme: { accentColor: AccentColor };
}
