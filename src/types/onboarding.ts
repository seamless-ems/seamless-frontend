
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
  // use start/end dates instead of a single date
  startDate: string;
  endDate?: string;
  location: string;
  eventWebsite?: string;
  type: 'virtual' | 'in-person' | 'hybrid';
  description: string;
  // email settings
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  emailSignature?: string;
  // modules enabled for the event
  modules?: string[];
  // optional media (url) or drive integration info
  eventImage?: string;
  googleDriveConnected?: boolean;
  rootFolder?: string;
  integrationId?: string;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  organization: OrganizationData;
  team: TeamData;
  event: EventData;
  isLoading: boolean;
  error: string | null;
}
