import { useState, useEffect } from "react";
import { Joyride, STATUS } from "react-joyride";

const JoyrideComponent = Joyride || Joyride?.default;

export function ProductTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run if specifically requested by a fresh signup or settings button
    const shouldRunTour = localStorage.getItem("revflux_run_tour");
    if (shouldRunTour === "true") {
      setTimeout(() => setRun(true), 1500);
    }
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS?.FINISHED || "finished", STATUS?.SKIPPED || "skipped"];
    
    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.removeItem("revflux_run_tour");
      localStorage.setItem("revflux_has_seen_tour", "true");
    }
  };

  const steps = [
    {
      target: ".tour-ai-attention",
      content: "This is your AI Attention Center. It surfaces deals at risk and follow-ups you need to focus on today.",
      disableBeacon: true,
      placement: "bottom",
    },
    {
      target: ".tour-pipeline-engagement",
      content: "Track your pipeline health over time. See how many leads are entering and converting each month.",
      disableBeacon: true,
      placement: "right",
    },
    {
      target: ".tour-add-lead",
      content: "Click here to add a new lead to your CRM manually, or import from CSV.",
      disableBeacon: true,
      placement: "left",
    },
    {
      target: ".tour-sidebar",
      content: "Navigate through your Contacts, Pipeline, Tasks, and AI settings right from here.",
      disableBeacon: true,
      placement: "right",
    }
  ];

  if (typeof JoyrideComponent !== "function") return null;

  return (
    <JoyrideComponent
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: "#E11D48", // rose-600
          backgroundColor: "#ffffff",
          textColor: "#0f172a",
        },
        buttonNext: {
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          padding: "8px 16px",
        },
        buttonBack: {
          marginRight: 10,
          color: "#64748b",
        },
      }}
    />
  );
}
