
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Calendar, 
  Globe, 
  Layout, 
  ArrowRight,
  PartyPopper,
  Info
} from 'lucide-react';
import { Mail, FolderOpen, MapPin, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  OnboardingStep, 
  OnboardingState, 
  OrganizationData, 
  TeamData, 
  EventData 
} from '../../types/onboarding';
import ProgressBar from './ProgressBar';
import StepContainer from './StepContainer';
import { setOnboardingCompleted } from '@/lib/onboarding';
import { toast } from 'sonner';
import { createOrganization, createTeam, createEvent, uploadFile, getGoogleDriveStatus, getIntegrationUrl, deleteIntegration } from '@/lib/api';
import { generateUuid } from '@/lib/utils';
import GoogleDriveFolderPicker from '@/components/organizer/GoogleDriveFolderPicker';
import EventMediaUploader from '@/components/organizer/EventMediaUploader';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState>({
    currentStep: OnboardingStep.ORGANIZATION,
    organization: { name: '', website: '', industry: '', description: '' },
    team: { name: '', purpose: '', size: '1-10' },
    event: {
      title: '',
      startDate: '',
      endDate: '',
      location: '',
      eventWebsite: '',
      type: 'virtual',
      description: '',
      fromName: '',
      fromEmail: '',
      replyToEmail: '',
      emailSignature: '',
      modules: ['speaker'],
      eventImage: undefined,
      googleDriveConnected: false,
      rootFolder: '',
      integrationId: null,
    },
    isLoading: false,
    error: null,
  });

  const updateOrg = (data: Partial<OrganizationData>) => {
    setState(prev => ({ ...prev, organization: { ...prev.organization, ...data } }));
  };

  const updateTeam = (data: Partial<TeamData>) => {
    setState(prev => ({ ...prev, team: { ...prev.team, ...data } }));
  };

  const updateEvent = (data: Partial<EventData>) => {
    setState(prev => ({ ...prev, event: { ...prev.event, ...data } }));
  };

  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [driveFolders, setDriveFolders] = useState<any[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string[]>([]);

  const availableModules = [
    {
      id: 'speaker',
      name: 'Speakers',
      description: 'Manage speakers, intake forms, and promo cards',
      icon: Calendar,
      color: 'speaker',
      available: true,
    },
    {
      id: 'schedule',
      name: 'Schedule',
      description: 'Create and publish event schedules',
      icon: Calendar,
      color: 'schedule',
      available: false,
      comingSoon: true,
    },
    {
      id: 'content',
      name: 'Content',
      description: 'Centralized hub for presentations and files',
      icon: Calendar,
      color: 'content',
      available: false,
      comingSoon: true,
    },
    {
      id: 'partners',
      name: 'Partners',
      description: 'Manage sponsors and partners',
      icon: Users,
      color: 'primary',
      available: false,
      comingSoon: true,
    },
    {
      id: 'attendee',
      name: 'Attendees',
      description: 'Manage registrations and communications',
      icon: Users,
      color: 'attendee',
      available: false,
      comingSoon: true,
    },
  ];

  const toggleModule = (moduleId: string) => {
    const set = new Set(state.event.modules || []);
    if (set.has(moduleId)) set.delete(moduleId);
    else set.add(moduleId);
    updateEvent({ modules: Array.from(set) });
  };

  // adapter so GoogleDriveFolderPicker can call setFormData either with a value or updater function
  const setEventFormData = (val: any) => {
    if (typeof val === 'function') {
      setState((prev) => ({ ...prev, event: val(prev.event) }));
    } else {
      updateEvent(val);
    }
  };

  // Check Google Drive integration status and populate folders when onboarding mounts
  React.useEffect(() => {
    (async () => {
      try {
        const status = await getGoogleDriveStatus();
        if (status?.connected) {
          const folders = (status as any).folders ?? [];
          setDriveFolders(folders);
          setState((prev) => ({
            ...prev,
            event: {
              ...prev.event,
              googleDriveConnected: true,
              rootFolder: (status as any).root_folder ?? (folders.length ? folders[0].id : prev.event.rootFolder ?? ''),
              integrationId: (status as any).integration?.id ?? (status as any).integration_id ?? prev.event.integrationId ?? '',
            },
          }));
        }
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  const nextStep = async () => {
    if (state.currentStep === OnboardingStep.ORGANIZATION) {
      setState(prev => ({ ...prev, currentStep: OnboardingStep.TEAM }));
    } else if (state.currentStep === OnboardingStep.TEAM) {
      setState(prev => ({ ...prev, currentStep: OnboardingStep.EVENT }));
    } else if (state.currentStep === OnboardingStep.EVENT) {
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        // Create organization and team
        const orgRes = await createOrganization({ name: state.organization.name });
        const teamRes = await createTeam({ name: state.team.name, description: state.team.purpose, organizationId: orgRes.id });

        // Prepare event payload
        const eventId = generateUuid();
        const modulesArr = state.event.modules || [];
        const modulesObj: Record<string, boolean> = {};
        modulesArr.forEach((m) => (modulesObj[m] = true));

        const payload: any = {
          ...state.event,
          modules: modulesObj,
          team_id: teamRes?.id,
          id: eventId,
        };

        if (state.event.googleDriveConnected && state.event.integrationId) {
          payload.integrationId = state.event.integrationId;
        }

        // Upload image if provided (associate with generated eventId)
        try {
          if (eventImageFile) {
            const up = await uploadFile(eventImageFile, undefined, eventId);
            const imageValue = up?.public_url ?? up?.publicUrl ?? up?.url ?? up?.id ?? null;
            if (imageValue) payload.eventImage = imageValue;
          }
        } catch (err) {
          
        }

        // Create event on backend
        await createEvent(payload);

        // Mark onboarding as completed
        setOnboardingCompleted(true);

        setState(prev => ({ ...prev, currentStep: OnboardingStep.SUCCESS, isLoading: false }));
        toast.success('Setup completed successfully!');
      } catch (error) {
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Failed to complete setup' 
        }));
        toast.error('Failed to complete setup. Please try again.');
      }
    }
  };

  const prevStep = () => {
    if (state.currentStep > OnboardingStep.ORGANIZATION) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Open the confirmation modal
  const skipOnboarding = () => {
    setShowSkipConfirm(true);
  };

  // Confirm skipping: persist and navigate
  const confirmSkip = () => {
    try {
      setOnboardingCompleted(true);
      toast.success('Onboarding skipped');
      setShowSkipConfirm(false);
      navigate('/organizer');
    } catch (err) {
      
      toast.error('Could not skip onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-4xl h-[calc(100vh-4rem)] flex flex-col justify-between">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
              <span>Welcome to Seamless Events</span>
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
              <button
                onClick={skipOnboarding}
                aria-label="Skip onboarding"
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Skip onboarding
              </button>
            </div>
          </div>
        </div>

        {state.currentStep !== OnboardingStep.SUCCESS && (
          <ProgressBar currentStep={state.currentStep} />
        )}

        <main className="mt-8 flex-1">
          {state.currentStep === OnboardingStep.ORGANIZATION && (
            <StepContainer
              title="Establish your organization"
              subtitle="The high-level entity that owns all your events and teams."
              onNext={nextStep}
              isNextDisabled={!state.organization.name}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Acme Global"
                      value={state.organization.name}
                      onChange={(e) => updateOrg({ name: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </StepContainer>
          )}

          {state.currentStep === OnboardingStep.TEAM && (
            <StepContainer
              title="Create your first team"
              subtitle="Group collaborators together. You can always add more teams later."
              onNext={nextStep}
              onBack={prevStep}
              isNextDisabled={!state.team.name}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Marketing Squad"
                      value={state.team.name}
                      onChange={(e) => updateTeam({ name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Description</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      className="col-span-3 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Purpose of the team"
                      value={state.team.purpose}
                      onChange={(e) => updateTeam({ purpose: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </StepContainer>
          )}

          {state.currentStep === OnboardingStep.EVENT && (
            <StepContainer
              title="Plan your first event"
              subtitle="The heart of Seamless Events. What's the big occasion?"
              onNext={nextStep}
              onBack={prevStep}
              nextLabel={state.isLoading ? 'Processing...' : 'Complete Setup'}
              isNextDisabled={!state.event.title || !state.event.startDate || state.isLoading}
            >
              <div className="space-y-6">
                {/* Google Drive Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      Google Drive Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Connect Google Drive</p>
                        <p className="text-sm text-muted-foreground">Sync speaker assets and content automatically</p>
                      </div>
                      {state.event.googleDriveConnected ? (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" type="button" disabled>
                            <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Connected
                          </Button>
                          <Button
                            variant="destructive"
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteIntegration('google');
                                setDriveFolders([]);
                                setEventFormData((prev: any) => ({ ...prev, googleDriveConnected: false, rootFolder: '' }));
                                toast.success('Google Drive disconnected');
                              } catch (err) {
                                
                                toast.error('Failed to disconnect Google Drive');
                              }
                            }}
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await getIntegrationUrl('google');
                              if (res?.url) {
                                window.location.href = res.url;
                              } else {
                                toast.error('Failed to start integration');
                              }
                            } catch (err) {
                              
                              toast.error('Failed to start integration');
                            }
                          }}
                        >
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none"><path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          Connect Drive
                        </Button>
                      )}
                    </div>

                    {state.event.googleDriveConnected && (
                      <div className="space-y-2">
                        <GoogleDriveFolderPicker
                          driveFolders={driveFolders}
                          setDriveFolders={setDriveFolders}
                          selectedFolderPath={selectedFolderPath}
                          setSelectedFolderPath={setSelectedFolderPath}
                          formData={state.event}
                          setFormData={setEventFormData}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Event Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Event Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Team</Label>
                      <Select value={state.team.name ? 'current-team' : ''}>
                        <SelectTrigger className="w-full sm:w-[300px]" disabled>
                          <SelectValue placeholder={state.team.name || 'Team'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current-team">{state.team.name || 'Your Team'}</SelectItem>
                        </SelectContent>
                      </Select>

                      <Label>Event Title</Label>
                      <Input
                        placeholder="e.g., Tech Summit 2025"
                        value={state.event.title}
                        onChange={(e) => updateEvent({ title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={state.event.startDate}
                          onChange={(e) => updateEvent({ startDate: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={state.event.endDate}
                          onChange={(e) => updateEvent({ endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Location
                      </Label>
                      <Input
                        placeholder="e.g., San Francisco, CA"
                        value={state.event.location}
                        onChange={(e) => updateEvent({ location: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <Link className="h-4 w-4 inline mr-1" />
                        Event Website
                      </Label>
                      <Input
                        type="text"
                        placeholder="https://example.com/event (optional)"
                        value={state.event.eventWebsite}
                        onChange={(e) => updateEvent({ eventWebsite: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email Settings Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Email Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>'From' Name</Label>
                      <Input
                        placeholder="e.g., Your Company Events"
                        value={state.event.fromName}
                        onChange={(e) => updateEvent({ fromName: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>'From' Email</Label>
                        <Input
                          type="email"
                          placeholder="events@yourcompany.com"
                          value={state.event.fromEmail}
                          onChange={(e) => updateEvent({ fromEmail: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>'Reply To' Email</Label>
                        <Input
                          type="email"
                          placeholder="hello@yourcompany.com"
                          value={state.event.replyToEmail}
                          onChange={(e) => updateEvent({ replyToEmail: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email Signature</Label>
                      <Textarea
                        placeholder="Your default email signature..."
                        value={state.event.emailSignature}
                        onChange={(e) => updateEvent({ emailSignature: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Modules Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Select Modules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {availableModules.map((module) => {
                        const Icon = module.icon;
                        const isSelected = (state.event.modules || []).includes(module.id);

                        return (
                          <div
                            key={module.id}
                            className={cn(
                              'rounded-lg border p-3 transition-all duration-200 cursor-pointer',
                              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                              !module.available && 'opacity-50 cursor-not-allowed'
                            )}
                            onClick={() => module.available && toggleModule(module.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className={cn('flex h-8 w-8 items-center justify-center rounded', isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                                <Icon className="h-4 w-4" />
                              </div>
                              {module.comingSoon ? (
                                <Badge variant="secondary" className="text-xs">Soon</Badge>
                              ) : (
                                <Switch checked={isSelected} disabled={!module.available} />
                              )}
                            </div>
                            <h4 className="font-medium text-foreground text-sm mb-1">{module.name}</h4>
                            <p className="text-xs text-muted-foreground">{module.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Images & Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Images & Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EventMediaUploader
                      eventImageFile={eventImageFile}
                      setEventImageFile={setEventImageFile}
                      eventImagePreview={eventImagePreview}
                      setEventImagePreview={setEventImagePreview}
                    />
                  </CardContent>
                </Card>
              </div>
            </StepContainer>
          )}

          {state.currentStep === OnboardingStep.SUCCESS && (
            <div className="max-w-2xl mx-auto text-center bg-white rounded-3xl shadow-2xl p-12 animate-in slide-in-from-bottom duration-700">
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <PartyPopper className="w-12 h-12 text-indigo-600" />
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 mb-4">You're all set!</h1>
              <p className="text-xl text-gray-500 mb-12">
                We've successfully created <span className="text-indigo-600 font-bold">{state.organization.name}</span>, 
                set up your <span className="text-indigo-600 font-bold">{state.team.name}</span> team, 
                and drafted <span className="text-indigo-600 font-bold">{state.event.title}</span>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Building2 className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-900">Org Ready</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Users className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-900">Team Active</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Calendar className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-900">Event Drafted</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/organizer')}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-indigo-200 transition-all flex items-center justify-center space-x-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </main>

        <Dialog open={showSkipConfirm} onOpenChange={(v) => setShowSkipConfirm(Boolean(v))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skip onboarding?</DialogTitle>
              <DialogDescription>
                Some features may not work as expected if you skip onboarding. You can finish setup later from the dashboard, but we'll take you there now.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white border mr-3 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmSkip}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm"
              >
                Skip anyway
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <footer className="mt-16 flex items-start justify-center text-gray-400 text-sm max-w-lg mx-auto text-center space-x-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>This flow helps you get started with Seamless Events in just a few minutes.</p>
        </footer>
      </div>
    </div>
  );
};

export default Onboarding;
