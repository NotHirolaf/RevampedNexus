import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CanvasBadge() {
  return (
    <Badge variant="outline" className="text-xs gap-1 shrink-0 px-1.5 py-0">
      <GraduationCap className="size-3" />
      Canvas
    </Badge>
  );
}
