"use client";

import { useState } from "react";

import { Icon } from "@/components/Icon";

import { ROUTINES, type Slot } from "../routines";
import { RoutineStepCard } from "./RoutineStepCard";
import styles from "./RoutinePlanner.module.css";

const TABS: { slot: Slot; label: string; icon: string }[] = [
  { slot: "am", label: "AM Routine", icon: "light_mode" },
  { slot: "pm", label: "PM Routine", icon: "dark_mode" },
];

export function RoutinePlanner() {
  const [slot, setSlot] = useState<Slot>("am");
  // 완료한 단계의 id. AM/PM을 오가도 유지되도록 슬롯과 분리해 둔다.
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());

  const steps = ROUTINES[slot];

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <>
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.slot}
            type="button"
            role="tab"
            aria-selected={slot === tab.slot}
            className={`${styles.tab} ${slot === tab.slot ? styles.tabActive : ""}`}
            onClick={() => setSlot(tab.slot)}
          >
            <Icon name={tab.icon} size="sm" />
            {tab.label}
          </button>
        ))}
      </div>

      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <RoutineStepCard
            key={step.id}
            step={step}
            order={index + 1}
            last={index === steps.length - 1}
            done={done.has(step.id)}
            // 앞 단계를 다 끝내야 다음 단계를 체크할 수 있다
            locked={steps.slice(0, index).some((prev) => !done.has(prev.id))}
            onToggle={() => toggle(step.id)}
          />
        ))}
      </ol>
    </>
  );
}
