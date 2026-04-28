export interface Event {
  id: string;
  title: string;
  startDate?: string;
  endDate?: string;
  location: string;
  status: 'draft' | 'active' | 'completed';
  userRole?: 'organizer' | 'speaker' | 'attendee' | 'none';
  // if the userRole is speaker, this will be the speakerId of the current user for this event
  speakerId?: string;
  speakerCount: number;
  attendeeCount: number;
  modules: EventModule[];
  fromEmail?: string;
  replyToEmail?: string;
  googleDriveConnected: boolean;
  rootFolder?: string;
  trialEnded: boolean;
}

export interface EventModule {
  id: string;
  name: 'speaker' | 'schedule' | 'content' | 'attendee' | 'app';
  enabled: boolean;
  status?: 'active' | 'inactive' | 'coming-soon';
}

export interface Speaker {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userId?: string | null;
  companyName?: string;
  companyRole?: string;
  linkedin?: string;
  bio?: string;
  headshot?: string;
  companyLogo?: string;
  companyLogoColour?: string;
  companyLogoWhite?: string;
  talkTitle?: string | null;
  talkDescription?: string | null;
  talkTopic?: string | null;
  sampleContent?: string | null;
  content?: Array<{ id?: string | null; content: string; contentType: string; name: string }> | null;
  formType?: string;
  speakerInformationStatus?: 'info_pending' | 'info_approved' | 'info_rejected';
  callForSpeakersStatus?: 'submitted' | 'accepted' | 'rejected';
  customFields?: Record<string, any>;
  websiteCardApproved: boolean;
  promoCardApproved: boolean;
  embedEnabled: boolean;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  headshotDownloadUrl?: string;
  colourLogoDownloadUrl?: string;
  whiteLogoDownloadUrl?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
}

export interface TeamUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  createdBy?: string;
  users: TeamUser[];
}

export interface Subscription {
  plan: 'starter' | 'professional' | 'enterprise';
  modules: string[];
  billingCycle: 'monthly' | 'annual';
  nextBillingDate: string;
  status: 'active' | 'past_due' | 'cancelled';
}
