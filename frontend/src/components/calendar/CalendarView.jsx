import { useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Badge } from "../ui";
import { TASK_STATUS_STYLES } from "../../lib/constants";

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

// Setup the localizer for react-big-calendar using date-fns
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// --- Custom Toolbar to fix Tailwind CSS resets ---
const CustomToolbar = (toolbar) => {
  const goToBack = () => {
    toolbar.onNavigate("PREV");
  };

  const goToNext = () => {
    toolbar.onNavigate("NEXT");
  };

  const goToCurrent = () => {
    toolbar.onNavigate("TODAY");
  };

  const setView = (view) => {
    toolbar.onView(view);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToCurrent}
          className="px-3 py-1.5 text-sm font-medium border border-line rounded-md hover:bg-surface-muted transition-colors"
        >
          Today
        </button>
        <div className="flex border border-line rounded-md overflow-hidden">
          <button
            onClick={goToBack}
            className="p-1.5 hover:bg-surface-muted transition-colors border-r border-line"
          >
            <ChevronLeft className="h-4 w-4 text-ink-soft" />
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 hover:bg-surface-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </button>
        </div>
      </div>

      {/* Label (Month Year) */}
      <div className="text-lg font-semibold text-ink">
        {toolbar.label}
      </div>

      {/* View Switcher */}
      <div className="flex bg-surface-muted rounded-lg p-1 border border-line">
        {["month", "week", "day", "agenda"].map((view) => (
          <button
            key={view}
            onClick={() => setView(view)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
              toolbar.view === view
                ? "bg-white shadow-sm text-ink"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {view}
          </button>
        ))}
      </div>
    </div>
  );
};

export function CalendarView({ tasks, onEventClick }) {
  // Map our backend tasks to the shape react-big-calendar expects
  const events = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => t.dueDate)
      .map((t) => {
        const start = new Date(t.dueDate);
        const end = new Date(t.dueDate);
        end.setHours(start.getHours() + 1);

        return {
          id: t._id,
          title: t.title,
          start,
          end,
          resource: t,
        };
      });
  }, [tasks]);

  const EventComponent = ({ event }) => {
    const task = event.resource;
    const isCompleted = task.status === "Completed";
    
    return (
      <div 
        className={`px-1 h-full w-full rounded overflow-hidden text-xs truncate ${
          isCompleted ? "opacity-60 line-through" : ""
        }`}
      >
        <div className="font-semibold">{event.title}</div>
        {task.relatedLead && (
          <div className="text-[10px] mt-0.5 opacity-80 truncate">
            {task.relatedLead.name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[700px] w-full bg-white p-5 rounded-xl border border-line shadow-sm">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        onSelectEvent={(e) => onEventClick(e.resource)}
        components={{
          event: EventComponent,
          toolbar: CustomToolbar,
        }}
        eventPropGetter={(event) => {
          const task = event.resource;
          let backgroundColor = "#3b82f6"; // brand-500
          
          if (task.status === "Completed") backgroundColor = "#10b981"; // emerald-500
          else if (task.priority === "High") backgroundColor = "#f43f5e"; // rose-500
          else if (task.priority === "Low") backgroundColor = "#94a3b8"; // slate-400
          
          return {
            style: {
              backgroundColor,
              border: "none",
              borderRadius: "6px",
              opacity: 0.9,
              color: "#fff",
              display: "block"
            },
          };
        }}
      />
    </div>
  );
}
