export interface Event {
  id: string;
  title: string;
  startDate?: string;
  endDate?: string;
  location: string;
  status: 'draft' | 'active' | 'completed';
  speakerCount: number;
  attendeeCount: number;
  modules: EventModule[];
  fromEmail?: string;
  replyToEmail?: string;
  emailSignature?: string;
  googleDriveConnected: boolean;
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

export interface TeamUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  is_admin: boolean;
  team_id: string;
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
