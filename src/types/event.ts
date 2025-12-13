export interface Event {
  id: string;
  title: string;
  dates: string;
  location: string;
  status: 'draft' | 'active' | 'completed';
  speakerCount: number;
  attendeeCount: number;
  modules: EventModule[];
  fromEmail?: string;
  replyEmail?: string;
  emailSignature?: string;
  googleDriveLinked: boolean;
  rootFolder?: string;
}

export interface EventModule {
  id: string;
  name: 'speaker' | 'schedule' | 'content' | 'attendee' | 'app';
  enabled: boolean;
  status?: 'active' | 'inactive' | 'coming-soon';
}

export interface Speaker {
  id: string;
  name: string;
  email: string;
  title: string;
  company: string;
  headshot?: string;
  companyLogo?: string;
  linkedin?: string;
  bio?: string;
  intakeFormStatus: 'pending' | 'submitted' | 'approved';
  websiteCardApproved: boolean;
  promoCardApproved: boolean;
  registeredAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
}

export interface Subscription {
  plan: 'starter' | 'professional' | 'enterprise';
  modules: string[];
  billingCycle: 'monthly' | 'annual';
  nextBillingDate: string;
  status: 'active' | 'past_due' | 'cancelled';
}
