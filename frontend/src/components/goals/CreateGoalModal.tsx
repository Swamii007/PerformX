"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { goalsApi, aiApi } from "@/lib/api";
import { Sparkles, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const THRUST_AREAS = [
  "Revenue Growth", "Cost Optimization", "Customer Satisfaction",
  "Operational Excellence", "People Development", "Innovation",
  "Compliance & Risk", "Quality"
];

const UOM_TYPES = [
  { value: "numeric_min", label: "Numeric — Higher is Better (e.g., Sales, Revenue)" },
  { value: "numeric_max", label: "Numeric — Lower is Better (e.g., TAT, Cost)" },
  { value: "timeline", label: "Timeline — Date-based Completion" },
  { value: "zero", label: "Zero-Based — Zero = Success (e.g., Incidents)" },
];

const schema = z.object({
  thrust_area: z.string().min(1, "Please select a thrust area"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().optional(),
  uom_type: z.string().min(1, "Please select a unit of measurement"),
  target_value: z.string().optional(),
  target_date: z.string().optional(),
  weightage: z.string()
    .min(1, "Weightage is required")
    .refine(v => {
      const n = parseFloat(v);
      return !isNaN(n) && n >= 10 && n <= 100;
    }, "Weightage must be between 10% and 100%"),
});

type FormData = z.infer<typeof schema>;

interface CreateGoalModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cycleId: string;
  editGoal?: Record<string, unknown> | null;
  isSharedGoal?: boolean; // recipients can only edit weightage
}

interface AISuggestion {
  title: string;
  description: string;
  uom_type: string;
  target_value?: number;
  weightage_suggestion: number;
  rationale: string;
}

export function CreateGoalModal({ open, onClose, onSuccess, cycleId, editGoal, isSharedGoal }: CreateGoalModalProps) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [selectedThrust, setSelectedThrust] = useState(editGoal?.thrust_area as string || "");

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editGoal ? {
      thrust_area: editGoal.thrust_area as string || "",
      title: editGoal.title as string || "",
      description: editGoal.description as string || "",
      uom_type: editGoal.uom_type as string || "",
      target_value: editGoal.target_value?.toString() || "",
      weightage: editGoal.weightage?.toString() || "",
    } : {},
  });

  const uomType = watch("uom_type");

  const handleGetSuggestions = async () => {
    if (!selectedThrust) {
      toast.warning("Select a thrust area first to get AI suggestions");
      return;
    }
    setAiLoading(true);
    try {
      const res = await aiApi.suggestGoals({ thrust_area: selectedThrust, cycle_id: cycleId });
      setSuggestions(res.data.suggestions || []);
      toast.success(`Got ${res.data.suggestions?.length || 0} AI suggestions`);
    } catch {
      toast.error("AI suggestions unavailable. Check your Gemini API key.");
      setSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = (s: AISuggestion) => {
    setValue("title", s.title, { shouldValidate: true });
    setValue("description", s.description, { shouldValidate: true });
    setValue("uom_type", s.uom_type, { shouldValidate: true });
    if (s.target_value) setValue("target_value", s.target_value.toString(), { shouldValidate: true });
    setValue("weightage", s.weightage_suggestion.toString(), { shouldValidate: true });
    setSuggestions([]);
    toast.success("Suggestion applied — review and adjust as needed");
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        thrust_area: data.thrust_area,
        title: data.title,
        description: data.description || undefined,
        uom_type: data.uom_type,
        weightage: parseFloat(data.weightage),
        cycle_id: cycleId,
      };
      if (data.uom_type !== "timeline" && data.uom_type !== "zero" && data.target_value) {
        payload.target_value = parseFloat(data.target_value);
      }
      if (data.uom_type === "timeline" && data.target_date) {
        payload.target_date = new Date(data.target_date).toISOString();
      }

      if (editGoal) {
        // For shared goals, only send weightage
        const updatePayload = isSharedGoal ? { weightage: parseFloat(data.weightage) } : payload;
        await goalsApi.update(editGoal.id as string, updatePayload);
        toast.success("Goal updated successfully");
      } else {
        await goalsApi.create(payload);
        toast.success("Goal created successfully");
      }
      reset();
      setSuggestions([]);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to save goal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSuggestions([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editGoal ? (isSharedGoal ? "Adjust Weightage" : "Edit Goal") : "Create New Goal"}
          </DialogTitle>
        </DialogHeader>

        {/* Shared goal notice */}
        {isSharedGoal && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This is a shared departmental KPI. You can only adjust the weightage. Title and target are set by your manager.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Thrust Area + AI — read-only for shared goals */}
          {!isSharedGoal && (
            <div className="space-y-1.5">
              <Label>Thrust Area *</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={(v) => { setValue("thrust_area", v, { shouldValidate: true }); setSelectedThrust(v); setSuggestions([]); }}
                  defaultValue={editGoal?.thrust_area as string}
                >
                  <SelectTrigger className={cn("flex-1", errors.thrust_area && "border-red-500")}>
                    <SelectValue placeholder="Select thrust area..." />
                  </SelectTrigger>
                  <SelectContent>
                    {THRUST_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetSuggestions}
                  disabled={!selectedThrust || aiLoading}
                  className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950 flex-shrink-0"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AI Suggest
                </Button>
              </div>
              {errors.thrust_area && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {errors.thrust_area.message}</p>}
            </div>
          )}

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI-Powered Suggestions — Click to apply
              </p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="w-full text-left p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900 hover:border-purple-400 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{s.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.description}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{s.rationale} · Suggested weight: {s.weightage_suggestion}%</p>
                </button>
              ))}
            </div>
          )}

          {/* Title — read-only for shared goals */}
          {!isSharedGoal ? (
            <div className="space-y-1.5">
              <Label>Goal Title *</Label>
              <Input
                {...register("title")}
                placeholder="e.g., Increase quarterly sales by 20%"
                className={cn(errors.title && "border-red-500")}
              />
              {errors.title && <p className="text-xs text-red-500">⚠ {errors.title.message}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-slate-500">Goal Title (read-only)</Label>
              <div className="flex h-9 w-full items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-600 dark:text-slate-400">
                {editGoal?.title as string}
              </div>
            </div>
          )}

          {/* Description — read-only for shared goals */}
          {!isSharedGoal && (
            <div className="space-y-1.5">
              <Label>Description <span className="text-slate-400 text-xs">(optional)</span></Label>
              <Textarea
                {...register("description")}
                placeholder="Describe the goal and how success will be measured..."
                rows={2}
              />
            </div>
          )}

          {/* UoM — read-only for shared goals */}
          {!isSharedGoal ? (
            <div className="space-y-1.5">
              <Label>Unit of Measurement *</Label>
              <Select
                onValueChange={(v) => setValue("uom_type", v, { shouldValidate: true })}
                defaultValue={editGoal?.uom_type as string}
              >
                <SelectTrigger className={cn(errors.uom_type && "border-red-500")}>
                  <SelectValue placeholder="Select measurement type..." />
                </SelectTrigger>
                <SelectContent>
                  {UOM_TYPES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.uom_type && <p className="text-xs text-red-500">⚠ {errors.uom_type.message}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-slate-500">Measurement Type (read-only)</Label>
              <div className="flex h-9 w-full items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-600 dark:text-slate-400">
                {UOM_TYPES.find(u => u.value === editGoal?.uom_type)?.label || editGoal?.uom_type as string}
              </div>
            </div>
          )}

          {/* Target — read-only for shared goals */}
          {!isSharedGoal && (
            <div className="grid grid-cols-2 gap-4">
              {uomType !== "timeline" && uomType !== "zero" && (
                <div className="space-y-1.5">
                  <Label>Target Value *</Label>
                  <Input {...register("target_value")} type="number" placeholder="e.g., 100" />
                </div>
              )}
              {uomType === "timeline" && (
                <div className="space-y-1.5">
                  <Label>Target Date *</Label>
                  <Input {...register("target_date")} type="date" />
                </div>
              )}
            </div>
          )}

          {/* Weightage — always editable */}
          <div className="space-y-1.5">
            <Label>Weightage (%) *</Label>
            <Input
              {...register("weightage")}
              type="number"
              min={10}
              max={100}
              step={5}
              placeholder="Min 10%"
              className={cn(errors.weightage && "border-red-500")}
            />
            {errors.weightage && <p className="text-xs text-red-500">⚠ {errors.weightage.message}</p>}
            <p className="text-xs text-slate-400">Minimum 10% per goal. All goals must total 100% before submission.</p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading}>
              {editGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
