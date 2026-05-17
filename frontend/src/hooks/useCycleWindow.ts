"use client";
import { useState, useEffect } from "react";
import { cyclesApi } from "@/lib/api";

export interface CycleWindow {
  cycleId: string;
  cycleName: string;
  currentPhase: string;
  activeQuarter: string | null;   // "Q1" | "Q2" | "Q3" | "Q4" | null
  isGoalSettingOpen: boolean;
  isCheckinOpen: boolean;
  isClosed: boolean;
  bannerMessage: string | null;
  loading: boolean;
}

const PHASE_QUARTER_MAP: Record<string, string | null> = {
  goal_setting: null,
  q1_checkin: "Q1",
  q2_checkin: "Q2",
  q3_checkin: "Q3",
  q4_annual: "Q4",
  closed: null,
};

const PHASE_LABELS: Record<string, string> = {
  goal_setting: "Goal Setting",
  q1_checkin: "Q1 Check-in",
  q2_checkin: "Q2 Check-in",
  q3_checkin: "Q3 Check-in",
  q4_annual: "Q4 / Annual Review",
  closed: "Closed",
};

export function useCycleWindow(): CycleWindow {
  const [state, setState] = useState<CycleWindow>({
    cycleId: "2025-2026",
    cycleName: "FY 2025-2026",
    currentPhase: "goal_setting",
    activeQuarter: null,
    isGoalSettingOpen: true,
    isCheckinOpen: false,
    isClosed: false,
    bannerMessage: null,
    loading: true,
  });

  useEffect(() => {
    cyclesApi.getActive()
      .then(res => {
        const cycle = res.data;
        const phase = cycle.current_phase;
        const activeQuarter = PHASE_QUARTER_MAP[phase] ?? null;
        const isGoalSettingOpen = phase === "goal_setting";
        const isCheckinOpen = ["q1_checkin", "q2_checkin", "q3_checkin", "q4_annual"].includes(phase);
        const isClosed = phase === "closed";

        let bannerMessage: string | null = null;
        if (isClosed) {
          bannerMessage = `${cycle.name} is closed. All goals and check-ins are read-only.`;
        } else if (isCheckinOpen && activeQuarter) {
          bannerMessage = null; // open — no warning needed
        } else if (isGoalSettingOpen) {
          bannerMessage = null;
        }

        setState({
          cycleId: cycle.id,
          cycleName: cycle.name,
          currentPhase: phase,
          activeQuarter,
          isGoalSettingOpen,
          isCheckinOpen,
          isClosed,
          bannerMessage,
          loading: false,
        });
      })
      .catch(() => {
        setState(prev => ({ ...prev, loading: false }));
      });
  }, []);

  return state;
}

export function getQuarterWindowMessage(phase: string, requestedQuarter: string): string | null {
  const activeQuarter = PHASE_QUARTER_MAP[phase];
  if (phase === "closed") return "This cycle is closed. No updates allowed.";
  if (phase === "goal_setting") return "Check-in windows are not open yet. Goal setting is in progress.";
  if (activeQuarter && activeQuarter !== requestedQuarter) {
    return `${requestedQuarter} check-in window is closed. Currently in ${PHASE_LABELS[phase]} phase.`;
  }
  return null;
}
