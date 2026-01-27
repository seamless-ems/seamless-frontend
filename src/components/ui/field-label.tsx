/**
 * FieldLabel - Consistent label styling for speaker forms
 * Replaces repeated inline styles with a reusable component
 * 
 * Usage:
 * <FieldLabel label="First Name" />
 * <FieldLabel label="First Name" value="John" />
 */

interface FieldLabelProps {
  label: string;
  value?: string | React.ReactNode;
  className?: string;
}

export function FieldLabel({ label, value, className = "" }: FieldLabelProps) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      {value !== undefined && (
        <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}
