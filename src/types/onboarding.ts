
export enum OnboardingStep {
  ORGANIZATION = 1,
  TEAM = 2,
  EVENT = 3,
  SUCCESS = 4
}

export interface OrganizationData {
  name: string;
  website: string;
  industry: string;
  description: string;
}

export interface TeamData {
  name: string;
  purpose: string;
  size: string;
}

export interface EventData {
  title: string;
  date: string;
  location: string;
  type: 'virtual' | 'in-person' | 'hybrid';
  description: string;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  organization: OrganizationData;
  team: TeamData;
  event: EventData;
  isLoading: boolean;
  error: string | null;
}
