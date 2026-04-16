// Icon helper and dynamic field template creation used by CardBuilder
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QUICK_SWATCHES } from '@/lib/card-builder-utils';

// QUICK_SWATCHES used by QuickColorPicker
// Hex color input component
export function HexColorInput({ value, onChange, className }: { value: string; onChange: (hex: string) => void; className?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  return (
    <input
      type="text"
      value={text}
      onChange={(e: any) => {
        const raw = e.target.value;
        setText(raw);
        const hex = raw.startsWith('#') ? raw : '#' + raw;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) onChange(hex);
      }}
      onBlur={() => setText(value)}
      className={className}
      maxLength={7}
      spellCheck={false}
    />
  );
}

// Font size input component
export function FontSizeInput({ value, onChange, className }: { value: number; onChange: (size: number) => void; className?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e: any) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setText(raw);
        const val = parseInt(raw, 10);
        if (!isNaN(val) && val >= 8 && val <= 120) onChange(val);
      }}
      onBlur={() => {
        const val = parseInt(text, 10);
        if (!isNaN(val)) {
          const clamped = Math.max(8, Math.min(120, val));
          onChange(clamped);
          setText(String(clamped));
        } else {
          setText(String(value));
        }
      }}
      className={className}
      maxLength={3}
      spellCheck={false}
    />
  );
}

// Position input component
export function PositionInput({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const [text, setText] = useState(String(Math.round(value)));
  useEffect(() => { setText(String(Math.round(value))); }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e: any) => {
        const raw = e.target.value.replace(/[^0-9\-]/g, "");
        setText(raw);
        const val = parseInt(raw, 10);
        if (!isNaN(val)) onChange(val);
      }}
      onBlur={() => setText(String(Math.round(value)))}
      className={className}
      maxLength={5}
      spellCheck={false}
    />
  );
}

// QuickColorPicker component using Popover
export function QuickColorPicker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-7 h-7 rounded border-2 border-border hover:border-primary transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ backgroundColor: value }}
          title={label ?? "Pick colour"}
        />
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3 z-[300]" align="start" side="bottom">
        <div className="text-xs font-medium text-muted-foreground mb-2">Hex</div>
        <div className="w-full h-8 text-sm font-mono px-2 rounded border border-border bg-background mb-3">
          <input value={value} onChange={(e: any) => onChange(e.target.value)} className="w-full h-full bg-transparent outline-none" />
        </div>
        <div className="grid grid-cols-6 gap-1">
          {QUICK_SWATCHES.map(c => (
            <button key={c} type="button" onClick={() => onChange(c)} className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110`} style={{ backgroundColor: c }} title={c} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Template thumbnail component
export function TemplateThumbnail({ type }: { type: string }) {
  const PersonSilhouette = ({
    size = 40,
    className = "",
  }: {
    size?: number;
    className?: string;
  }) => (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={{ width: size, height: size * 1.1 }}
    >
      <div
        className="rounded-full bg-white/30"
        style={{ width: size * 0.42, height: size * 0.42 }}
      />
      <div
        className="rounded-t-full bg-white/30 mt-0.5"
        style={{ width: size * 0.58, height: size * 0.32 }}
      />
    </div>
  );

  const TN_PHOTO = "#d1d5db";

  switch (type) {
    case "overlay":
      return (
        <div
          className="relative w-full h-full overflow-hidden"
          style={{ background: TN_PHOTO }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <PersonSilhouette size={60} />
          </div>
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: "55%",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
            }}
          />
          <div
            className="absolute top-3 right-3 rounded"
            style={{ width: "22%", height: "9%", background: "rgba(255,255,255,0.6)" }}
          />
          <div className="absolute bottom-4 left-4 right-8 space-y-1.5">
            <div
              className="rounded-sm"
              style={{ height: 8, width: "58%", background: "#ffffff" }}
            />
            <div
              className="rounded-sm"
              style={{
                height: 5,
                width: "78%",
                background: "rgba(255,255,255,0.65)",
              }}
            />
            <div
              className="rounded-sm"
              style={{
                height: 4,
                width: "42%",
                background: "rgba(255,255,255,0.45)",
              }}
            />
          </div>
        </div>
      );
    case "classic":
      return (
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
          <div className="w-full shrink-0" style={{ height: "67%", background: TN_PHOTO }} />
          <div className="flex flex-col justify-center gap-1 px-3 flex-1">
            <div className="rounded" style={{ height: 7, width: "68%", background: "#111827" }} />
            <div className="rounded" style={{ height: 7, width: "52%", background: "#111827" }} />
            <div className="rounded mt-0.5" style={{ height: 4, width: "55%", background: "#6B7280" }} />
            <div className="rounded" style={{ height: 3, width: "42%", background: "#9CA3AF" }} />
          </div>
        </div>
      );
    case "spotlight":
      return (
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col items-center justify-center p-4 gap-3 text-center">
          <div
            className="rounded-full"
            style={{ width: "40%", height: "40%", background: TN_PHOTO }}
          />
          <div className="space-y-1.5 w-full flex flex-col items-center">
            <div
              className="rounded"
              style={{ height: 8, width: "60%", background: "#111827" }}
            />
            <div
              className="rounded"
              style={{ height: 5, width: "45%", background: "#6B7280" }}
            />
          </div>
          <div
            className="absolute bottom-4 rounded"
            style={{ width: "25%", height: "8%", background: "#E5E7EB" }}
          />
        </div>
      );
    case "side-by-side":
      return (
        <div className="relative w-full h-full bg-white overflow-hidden flex">
          <div className="w-1/2 h-full" style={{ background: TN_PHOTO }}>
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <PersonSilhouette size={50} />
            </div>
          </div>
          <div className="w-1/2 h-full p-4 flex flex-col justify-center gap-2">
            <div
              className="rounded"
              style={{ height: 8, width: "80%", background: "#111827" }}
            />
            <div
              className="rounded"
              style={{ height: 8, width: "60%", background: "#111827" }}
            />
            <div
              className="rounded"
              style={{ height: 5, width: "50%", background: "#6B7280" }}
            />
            <div
              className="mt-2 rounded"
              style={{ width: "35%", height: "10%", background: "#E5E7EB" }}
            />
          </div>
        </div>
      );
    case "editorial":
      return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col p-4">
          <div
            className="absolute top-0 right-0 w-2/3 h-full opacity-40"
            style={{
              background: `linear-gradient(to left, ${TN_PHOTO}, transparent)`,
            }}
          />
          <div className="mt-auto space-y-2 relative z-10">
            <div
              className="rounded"
              style={{ height: 10, width: "75%", background: "#F9FAFB" }}
            />
            <div
              className="rounded"
              style={{ height: 6, width: "50%", background: "#9CA3AF" }}
            />
            <div
              className="w-10 h-0.5 mt-2"
              style={{ background: "#3B82F6" }}
            />
          </div>
          <div
            className="absolute top-4 left-4 rounded"
            style={{ width: "20%", height: "8%", background: "rgba(255,255,255,0.2)" }}
          />
        </div>
      );
    case "brand-forward":
      return (
        <div className="relative w-full h-full bg-slate-50 overflow-hidden flex flex-col">
          <div className="h-1/2 w-full" style={{ background: TN_PHOTO }}>
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <PersonSilhouette size={60} />
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div
              className="rounded"
              style={{ height: 10, width: "85%", background: "#111827" }}
            />
            <div
              className="rounded"
              style={{ height: 6, width: "60%", background: "#4B5563" }}
            />
            <div
              className="mt-4 rounded"
              style={{ width: "30%", height: "12%", background: "#E5E7EB" }}
            />
          </div>
        </div>
      );
    case "instagram-feed":
      return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: TN_PHOTO }}>
          {/* Full-bleed photo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <PersonSilhouette size={64} className="opacity-25" />
          </div>
          {/* Gradient overlay — bottom ~52% */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: "52%", background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)" }} />
          {/* Event logo — top right */}
          <div className="absolute top-2 right-2 rounded" style={{ width: "26%", height: "8%", background: "rgba(255,255,255,0.3)" }} />
          {/* Text — bottom left */}
          <div className="absolute bottom-3 left-3 space-y-1">
            <div className="rounded-sm" style={{ height: 8, width: 52, background: "#ffffff" }} />
            <div className="rounded-sm" style={{ height: 8, width: 40, background: "#ffffff" }} />
            <div className="rounded-sm" style={{ height: 4, width: 48, background: "rgba(255,255,255,0.6)" }} />
            <div className="rounded-sm" style={{ height: 4, width: 36, background: "rgba(255,255,255,0.4)" }} />
          </div>
        </div>
      );
    case "instagram-story":
      return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col items-center" style={{ paddingTop: "5%" }}>
          {/* Event logo — top centre */}
          <div className="rounded shrink-0" style={{ width: "34%", height: "5%", background: "rgba(255,255,255,0.25)" }} />
          {/* Circle headshot — slightly smaller than full width so dark bg shows around it */}
          <div className="rounded-full mt-2 shrink-0" style={{ width: "64%", paddingTop: "64%", background: TN_PHOTO, opacity: 0.85 }} />
          {/* Text — centred below */}
          <div className="mt-2 w-full px-3 flex flex-col items-center gap-1.5">
            <div className="rounded" style={{ height: 7, width: "68%", background: "#ffffff" }} />
            <div className="rounded" style={{ height: 7, width: "54%", background: "#ffffff" }} />
            <div className="rounded mt-0.5" style={{ height: 4, width: "50%", background: "rgba(255,255,255,0.6)" }} />
            <div className="rounded" style={{ height: 4, width: "38%", background: "rgba(255,255,255,0.4)" }} />
          </div>
          {/* Company logo — close to text, same visual weight as event logo above */}
          <div className="rounded mt-3 shrink-0" style={{ width: "38%", height: "5.5%", background: "rgba(255,255,255,0.2)" }} />
        </div>
      );
    case "linkedin-post":
      return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex">
          {/* Circle headshot — left column */}
          <div className="h-full shrink-0 flex items-center justify-center" style={{ width: "44%", background: TN_PHOTO, opacity: 0.7 }}>
            <div className="rounded-full" style={{ width: "62%", paddingTop: "62%", background: "rgba(0,0,0,0.25)" }} />
          </div>
          {/* Right column */}
          <div className="flex-1 relative flex flex-col justify-center px-3 py-2">
            {/* Company logo — top right */}
            <div className="absolute top-2 right-2 rounded" style={{ width: "32%", height: "9%", background: "rgba(255,255,255,0.2)" }} />
            {/* Speaker name + details */}
            <div className="flex flex-col gap-1.5">
              <div className="rounded" style={{ height: 8, width: "90%", background: "#ffffff" }} />
              <div className="rounded" style={{ height: 8, width: "70%", background: "#ffffff" }} />
              <div className="rounded mt-1" style={{ height: 4, width: "65%", background: "rgba(255,255,255,0.6)" }} />
              <div className="rounded" style={{ height: 4, width: "50%", background: "rgba(255,255,255,0.4)" }} />
            </div>
            {/* Event logo — bottom right */}
            <div className="absolute bottom-2 right-2 rounded" style={{ width: "32%", height: "9%", background: "rgba(255,255,255,0.2)" }} />
          </div>
        </div>
      );
    case "x-post":
      return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex">
          <div className="h-full flex items-center justify-center" style={{ width: "44%", background: TN_PHOTO, opacity: 0.6 }}>
            <PersonSilhouette size={40} className="opacity-30" />
          </div>
          <div className="flex-1 p-3 flex flex-col justify-center gap-1.5">
            <div className="rounded mb-1" style={{ height: "10%", width: "55%", background: "rgba(255,255,255,0.2)" }} />
            <div className="rounded" style={{ height: 5, width: "70%", background: "rgba(255,255,255,0.5)" }} />
            <div className="rounded" style={{ height: 9, width: "90%", background: "#ffffff" }} />
            <div className="rounded mt-1" style={{ height: 5, width: "60%", background: "rgba(255,255,255,0.65)" }} />
            <div className="rounded" style={{ height: 4, width: "45%", background: "rgba(255,255,255,0.4)" }} />
          </div>
        </div>
      );
    default:
      return <div className="w-full h-full bg-muted rounded" />;
  }
}

// Utility helpers extracted from CardBuilder for colors and HTML escaping
// Dynamic helpers and constants are provided from card-builder-utils
