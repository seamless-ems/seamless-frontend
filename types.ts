export enum SpeakerStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED'
}

export interface Speaker {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  companyRole: string;
  bio: string;
  talkTitle: string;
  talkDescription: string;
  slidesUrl?: string; // Mocked Drive URL
  profilePhotoUrl?: string; // Mocked Drive URL
  companyLogoUrl?: string; // Mocked Drive URL
  status: SpeakerStatus;
  submissionDate: string;
  lastUpdated: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SPEAKER';
}