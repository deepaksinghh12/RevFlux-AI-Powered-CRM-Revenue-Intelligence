import { useState } from "react";
import { Dialog, Button, Input, Textarea, Field, Spinner } from "../ui";
import { tasksApi } from "../../lib/services";
import { toast } from "sonner";

export function TaskScheduleDialog({ open, onClose, lead, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "Follow up",
    dueDate: "",
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dueDate) {
      return toast.error("Please select a date and time");
    }

    setLoading(true);
    try {
      await tasksApi.create({
        relatedLead: lead._id,
        title: formData.title,
        dueDate: formData.dueDate,
        description: formData.notes,
        status: "Pending",
      });
      toast.success("Follow-up scheduled!");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to schedule task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Schedule Follow-up" description={`Create a task to follow up with ${lead?.name}`}>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label="Task Title">
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </Field>
        <Field label="Date & Time">
          <Input
            type="datetime-local"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
          />
        </Field>
        <Field label="Notes (Optional)">
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="e.g. Ask about the new Q3 budget..."
          />
        </Field>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Spinner size="sm" />}
            Schedule
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
