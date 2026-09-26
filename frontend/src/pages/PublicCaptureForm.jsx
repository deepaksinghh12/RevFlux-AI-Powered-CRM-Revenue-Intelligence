import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Input, Textarea, Field, Spinner } from "../components/ui";
import { CheckCircle2 } from "lucide-react";
import api from "../lib/api";

export default function PublicCaptureForm() {
  const { ownerId } = useParams();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.post(`/capture/${ownerId}`, formData);
      setSuccess(true);
    } catch (err) {
      setError(err?.message || "Failed to submit form.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
        <div className="w-full max-w-md rounded-3xl bg-surface p-10 text-center shadow-[var(--shadow-pop)] animate-fade-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-ink">Thank you!</h2>
          <p className="mt-2 text-ink-soft">
            Your information has been received. We'll be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-[var(--shadow-card)] sm:p-10">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Let's connect</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Fill out the form below and we will get back to you as soon as possible.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-4">
            <Field label="Full Name">
              <Input
                required
                placeholder="Jane Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Field>
            <Field label="Email Address">
              <Input
                type="email"
                required
                placeholder="jane@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Field>
            <Field label="Phone Number">
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Field>
            <Field label="Company">
              <Input
                placeholder="Acme Corp"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </Field>
            <Field label="How can we help?">
              <Textarea
                placeholder="Tell us about your project or needs..."
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Field>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : "Submit Request"}
          </Button>
        </form>
      </div>
    </div>
  );
}
