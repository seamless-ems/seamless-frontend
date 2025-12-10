export enum SpeakerStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED'
}

export enum AssetStatus {
  UNKNOWN = 'UNKNOWN',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * Raw speaker row shape as imported from the spreadsheet/CSV.
 * The data is an array where the first row is headers and subsequent
 * rows are string values in the same order. Use `SpeakerRaw` to map
 * that row into a normalized `Speaker`.
 */
export interface SpeakerRaw {
  id: string;
  timestamp: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string; // role/title at company
  company: string;
  bio: string;
  disclaimer: string; // e.g. 'Yes' or free text
  headshot_drive_url: string;
  logo_drive_url: string;
  website_card_url: string;
  promo_card_url: string;
  speaker_asset_status: string; // free-form in sheet (e.g. 'Both Approved')
  website_card_status: string; // often 'Approved'
  promo_card_status: string; // often 'Approved'
  notes: string;
}

/**
 * Normalized speaker shape used throughout the app.
 */
export interface Speaker {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  companyRole?: string;
  bio?: string;
  disclaimer?: string;
  headshotDriveUrl?: string;
  companyLogoDriveUrl?: string;
  websiteCardUrl?: string;
  promoCardUrl?: string;
  // Associate a speaker with a specific event (optional)
  eventId?: string;
  // Friendly asset statuses derived from the raw status columns.
  speakerAssetStatus?: AssetStatus | string;
  websiteCardStatus?: AssetStatus | string;
  promoCardStatus?: AssetStatus | string;
  notes?: string;
  // existing app status and timestamps
  status?: SpeakerStatus;
  submissionDate?: string;
  lastUpdated?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SPEAKER';
}