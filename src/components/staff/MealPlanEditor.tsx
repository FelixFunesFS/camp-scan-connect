import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Utensils, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMealPlan } from "@/lib/phoneUtils";

const MEAL_CODE = "mc2026";
const SESSION_KEY = "mc_meal_unlocked";

const OPTIONS = [
  { value: "standard", label: "Standard Meal Plan" },
  { value: "vegan", label: "Vegan Meal Plan" },
  { value: "none", label: "No meal plan" },
] as const;

function isUnlocked() {
  try { return sessionStorage.getItem(SESSION_KEY) === "true"; } catch { return false; }
}

interface Props {
  attendeeId: string;
  attendeeName: string;
  currentPlan?: string | null;
  onSaved: () => void;
}

export function MealPlanEditor({ attendeeId, attendeeName, currentPlan, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const current = currentPlan || "none";

  const tryUnlock = () => {
    if (code.trim().toLowerCase() === MEAL_CODE) {
      try { sessionStorage.setItem(SESSION_KEY, "true"); } catch { /* ignore */ }
      setUnlocked(true);
      setCode("");
    } else {
      toast.error("That code isn't right");
      setCode("");
    }
  };

  const save = async (plan: string) => {
    if (plan === current) { setOpen(false); return; }
    setSaving(true);
    try {
      const { data: row, error: readErr } = await supabase
        .from("attendees").select("locked_fields, notes").eq("id", attendeeId).single();
      if (readErr) throw readErr;
      const locked = Array.from(new Set([...(row?.locked_fields || []), "meal_plan"]));
      const label = OPTIONS.find((o) => o.value === plan)?.label ?? plan;
      const note = `Meal plan changed to ${label} by staff (${new Date().toLocaleDateString()}).`;
      const notes = row?.notes ? `${row.notes}\n${note}` : note;
      const { error } = await supabase
        .from("attendees")
        .update({ meal_plan: plan as "standard" | "vegan" | "none", locked_fields: locked, notes })
        .eq("id", attendeeId);
      if (error) throw error;
      toast.success(`${attendeeName}: ${label}`);
      setOpen(false);
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save the meal plan. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => { setUnlocked(isUnlocked()); setOpen(true); }}>
        <Utensils className="h-4 w-4 mr-1" />
        Edit meal plan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Meal plan</DialogTitle>
            <DialogDescription>
              {attendeeName} · currently {formatMealPlan(current)}
            </DialogDescription>
          </DialogHeader>
          {!unlocked ? (
            <div className="space-y-3">
              <Label htmlFor="meal-code" className="flex items-center gap-1">
                <Lock className="h-4 w-4" /> Enter the meal plan code
              </Label>
              <Input
                id="meal-code"
                type="password"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
                className="h-12 text-center text-lg tracking-widest"
              />
              <Button className="h-12 w-full" disabled={!code.trim()} onClick={tryUnlock}>Unlock</Button>
            </div>
          ) : (
            <div className="grid gap-2">
              {OPTIONS.map((o) => (
                <Button
                  key={o.value}
                  variant={o.value === current ? "default" : "outline"}
                  className="h-12 justify-start"
                  disabled={saving}
                  onClick={() => save(o.value)}
                >
                  {o.label}
                </Button>
              ))}
              <p className="text-xs text-muted-foreground">Changes are kept even when RegFox syncs.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
