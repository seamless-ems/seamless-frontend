import { Speaker, SpeakerRaw, AssetStatus } from '../types';

/**
 * Try to map some common raw status strings into AssetStatus enum.
 */
export function parseAssetStatus(raw: string | undefined | null): AssetStatus | string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (s === 'approved') return AssetStatus.APPROVED;
  if (s === 'rejected') return AssetStatus.REJECTED;
  if (s === 'pending' || s === 'pending review' || s === 'pending_review') return AssetStatus.PENDING;
  if (s === 'both approved') return AssetStatus.APPROVED;
  return raw; // return original if unknown
}

/**
 * Map a raw row object (headers -> values) to a normalized Speaker.
 * `rowObj` should have keys matching the header names in the sheet (e.g. first_name, last_name, headshot_drive_url)
 */
export function mapRowToSpeaker(rowObj: Record<string, any>): Speaker {
  const firstName = rowObj.first_name || rowObj.firstName || '';
  const lastName = rowObj.last_name || rowObj.lastName || '';
  const id = rowObj.id || `${firstName}-${lastName}-${Math.random()}`;

  const speaker: Speaker = {
    id: String(id),
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: rowObj.email || '',
    companyName: rowObj.company || rowObj.companyName || undefined,
    companyRole: rowObj.title || rowObj.companyRole || undefined,
    bio: rowObj.bio || undefined,
    disclaimer: rowObj.disclaimer || undefined,
    headshotDriveUrl: rowObj.headshot_drive_url || rowObj.profilePhotoUrl || undefined,
    companyLogoDriveUrl: rowObj.logo_drive_url || rowObj.companyLogoUrl || undefined,
    websiteCardUrl: rowObj.website_card_url || undefined,
    promoCardUrl: rowObj.promo_card_url || undefined,
    speakerAssetStatus: parseAssetStatus(rowObj.speaker_asset_status),
    websiteCardStatus: parseAssetStatus(rowObj.website_card_status),
    promoCardStatus: parseAssetStatus(rowObj.promo_card_status),
    notes: rowObj.notes || undefined,
    submissionDate: rowObj.timestamp || undefined,
  };

  return speaker;
}
