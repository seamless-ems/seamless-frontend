
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

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState>({
    currentStep: OnboardingStep.ORGANIZATION,
    organization: { name: '', website: '', industry: '', description: '' },
    team: { name: '', purpose: '', size: '1-10' },
    event: { title: '', date: '', location: '', type: 'virtual', description: '' },
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

  const nextStep = async () => {
    if (state.currentStep === OnboardingStep.ORGANIZATION) {
      setState(prev => ({ ...prev, currentStep: OnboardingStep.TEAM }));
    } else if (state.currentStep === OnboardingStep.TEAM) {
      setState(prev => ({ ...prev, currentStep: OnboardingStep.EVENT }));
    } else if (state.currentStep === OnboardingStep.EVENT) {
      setState(prev => ({ ...prev, isLoading: true }));
      
      try {
        // TODO: Replace with actual API calls when backend endpoints are ready
        // Example API calls:
        // await createOrganization(state.organization);
        // await createTeam(state.team);
        // await createEvent(state.event);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mark onboarding as completed
        setOnboardingCompleted(true);
        
        setState(prev => ({ ...prev, currentStep: OnboardingStep.SUCCESS, isLoading: false }));
        toast.success('Setup completed successfully!');
      } catch (error) {
        console.error('Onboarding submission error:', error);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <span>Welcome to Seamless Events</span>
          </div>
          <h1 className="text-gray-900 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Let's get you set up.
          </h1>
        </div>

        {state.currentStep !== OnboardingStep.SUCCESS && (
          <ProgressBar currentStep={state.currentStep} />
        )}

        <main className="mt-12">
          {state.currentStep === OnboardingStep.ORGANIZATION && (
            <StepContainer
              title="Establish your organization"
              subtitle="The high-level entity that owns all your events and teams."
              onNext={nextStep}
              isNextDisabled={!state.organization.name}
            >
              <div className="space-y-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website (Optional)</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="https://acme.com"
                      value={state.organization.website}
                      onChange={(e) => updateOrg({ website: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none bg-white"
                    value={state.organization.industry}
                    onChange={(e) => updateOrg({ industry: e.target.value })}
                  >
                    <option value="">Select industry</option>
                    <option value="tech">Technology</option>
                    <option value="education">Education</option>
                    <option value="finance">Finance</option>
                    <option value="nonprofit">Non-Profit</option>
                  </select>
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
              <div className="space-y-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['1-10', '11-50', '50+'].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateTeam({ size })}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                          state.team.size === size
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
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
              isNextDisabled={!state.event.title || !state.event.date || state.isLoading}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                    <div className="relative">
                      <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="e.g. Annual Gala 2024"
                        value={state.event.title}
                        onChange={(e) => updateEvent({ title: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={state.event.date}
                        onChange={(e) => updateEvent({ date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none bg-white"
                      value={state.event.type}
                      onChange={(e) => updateEvent({ type: e.target.value as any })}
                    >
                      <option value="virtual">Virtual</option>
                      <option value="in-person">In-Person</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                    placeholder="Tell your guests what to expect..."
                    value={state.event.description}
                    onChange={(e) => updateEvent({ description: e.target.value })}
                  />
                </div>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

        <footer className="mt-16 flex items-start justify-center text-gray-400 text-sm max-w-lg mx-auto text-center space-x-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>This flow helps you get started with Seamless Events in just a few minutes.</p>
        </footer>
      </div>
    </div>
  );
};

export default Onboarding;
