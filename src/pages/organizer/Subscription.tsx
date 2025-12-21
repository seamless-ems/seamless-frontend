import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  Mic2,
  Calendar,
  FileText,
  Users,
  Smartphone,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  {
    id: "speaker",
    name: "Speaker Management",
    description: "Manage speakers, intake forms, and promo cards",
    icon: Mic2,
    color: "speaker",
    enabled: true,
    price: 49,
  },
  {
    id: "schedule",
    name: "Schedule Management",
    description: "Create and publish event schedules from Google Sheets",
    icon: Calendar,
    color: "schedule",
    enabled: true,
    price: 39,
  },
  {
    id: "content",
    name: "Content Management",
    description: "Centralized hub for presentations and files",
    icon: FileText,
    color: "content",
    enabled: false,
    price: 29,
    comingSoon: true,
  },
  {
    id: "attendee",
    name: "Attendee Management",
    description: "Manage registrations and communications",
    icon: Users,
    color: "attendee",
    enabled: false,
    price: 59,
    comingSoon: true,
  },
  {
    id: "app",
    name: "Event App",
    description: "Mobile app for attendees",
    icon: Smartphone,
    color: "attendee",
    enabled: false,
    price: 99,
    comingSoon: true,
  },
];

const colorStyles = {
  speaker: "text-speaker",
  schedule: "text-schedule",
  content: "text-content",
  attendee: "text-attendee",
};

export default function Subscription() {
  const enabledModules = modules.filter((m) => m.enabled);
  const totalPrice = enabledModules.reduce((sum, m) => sum + m.price, 0);

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Subscription
          </h1>
          <p className="text-muted-foreground mt-1">Manage your plan and billing</p>
        </div>

        {/* Current Plan */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Professional Plan
                  </h2>
                  <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                </div>
                <p className="text-muted-foreground">{enabledModules.length} modules active • Billed monthly</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-foreground">${totalPrice}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {enabledModules.map((module) => (
                <Badge key={module.id} variant="secondary" className="px-3 py-1">
                  <CheckCircle className="h-3 w-3 mr-1 text-success" />
                  {module.name}
                </Badge>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                <p>
                  Next billing date: <span className="text-foreground font-medium">January 15, 2025</span>
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline">
                  <CreditCard className="h-4 w-4" />
                  Update Payment
                </Button>
                <Button variant="outline">View Invoices</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground mb-4">Available Modules</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Card key={module.id} className={cn("transition-all duration-200", module.enabled && "border-primary/30", module.comingSoon && "opacity-60")}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-muted", colorStyles[module.color as keyof typeof colorStyles])}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{module.name}</h4>
                            {module.comingSoon && (
                              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">${module.price}/month</p>
                        </div>
                      </div>
                      <Switch checked={module.enabled} disabled={module.comingSoon} />
                    </div>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
