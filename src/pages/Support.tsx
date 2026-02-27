import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { sendSupportMessage } from "@/lib/api";

export default function Support() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) {
      toast({ title: "Please fill email and message" });
      return;
    }
    setIsSubmitting(true);
    try {
      await sendSupportMessage({ name: name || undefined, email, subject: subject || undefined, message });
      toast({ title: "Message sent", description: "Thanks — we will get back to you soon." });
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err: any) {
      
      // fallback: open mailto
      const mailto = `mailto:support@seamless.events?subject=${encodeURIComponent(subject || "Support request")}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
      window.location.href = mailto;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-semibold mb-2">Help & Support</h1>
      <p className="text-muted-foreground mb-6">Send us a message and we'll respond as soon as we can.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Name (optional)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>

        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
        </div>

        <div>
          <Label>Subject (optional)</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short subject" />
        </div>

        <div>
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="How can we help?" required />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="teal" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send Message"}</Button>
        </div>
      </form>
    </div>
  );
}
