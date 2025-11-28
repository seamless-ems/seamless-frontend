import { Speaker, SpeakerStatus, User } from '../types';

// Initial Mock Data
const MOCK_SPEAKERS: Speaker[] = [
  {
    id: '1',
    fullName: 'Alice Johnson',
    email: 'alice@techcorp.com',
    companyName: 'TechCorp',
    companyRole: 'CTO',
    bio: 'Veteran software engineer with 20 years of experience in distributed systems.',
    talkTitle: 'Scaling to Infinity',
    talkDescription: 'A deep dive into how we scaled our systems to handle 1M concurrent users.',
    status: SpeakerStatus.APPROVED,
    submissionDate: '2023-10-01T10:00:00Z',
    lastUpdated: '2023-10-01T10:00:00Z',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    companyLogoUrl: 'https://ui-avatars.com/api/?name=Tech+Corp&background=0D8ABC&color=fff&size=128',
  },
  {
    id: '2',
    fullName: 'Bob Smith',
    email: 'bob@startup.io',
    companyName: 'StartupIO',
    companyRole: 'Founder',
    bio: 'Serial entrepreneur and AI enthusiast.',
    talkTitle: 'AI in 2024',
    talkDescription: 'Predictions for the future of Generative AI.',
    status: SpeakerStatus.PENDING_REVIEW,
    submissionDate: '2023-10-05T14:30:00Z',
    lastUpdated: '2023-10-05T14:30:00Z',
  }
];

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// "Sheet" Database
const STORAGE_KEY = 'g_event_speakers';

const getStoredSpeakers = (): Speaker[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_SPEAKERS));
    return MOCK_SPEAKERS;
  }
  return JSON.parse(stored);
};

const saveSpeakers = (speakers: Speaker[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(speakers));
};

export const MockGoogleService = {
  // Simulate Google Login
  login: async (role: 'ADMIN' | 'SPEAKER'): Promise<User> => {
    await delay(800);
    if (role === 'ADMIN') {
      return { id: 'admin-1', name: 'Event Organizer', email: 'admin@event.com', role: 'ADMIN' };
    }
    // Return a speaker user matching the first mock speaker for demo purposes
    // In a real app, this would match the logged in email
    const speakers = getStoredSpeakers();
    const demoSpeaker = speakers[0]; 
    return { id: demoSpeaker.id, name: demoSpeaker.fullName, email: demoSpeaker.email, role: 'SPEAKER' };
  },

  // Simulate Sheet: Get All Rows
  getSpeakers: async (): Promise<Speaker[]> => {
    await delay(500);
    return getStoredSpeakers();
  },

  // Simulate Sheet: Get Single Row by ID
  getSpeakerById: async (id: string): Promise<Speaker | undefined> => {
    await delay(300);
    const speakers = getStoredSpeakers();
    return speakers.find(s => s.id === id);
  },

  // Simulate Sheet: Create Row
  createSpeaker: async (data: Partial<Speaker>): Promise<Speaker> => {
    await delay(800);
    const speakers = getStoredSpeakers();
    const newSpeaker: Speaker = {
      id: crypto.randomUUID(),
      fullName: data.fullName || '',
      email: data.email || '',
      companyName: data.companyName || '',
      companyRole: data.companyRole || '',
      bio: data.bio || '',
      talkTitle: data.talkTitle || '',
      talkDescription: data.talkDescription || '',
      status: SpeakerStatus.DRAFT,
      submissionDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      profilePhotoUrl: data.profilePhotoUrl || '',
      companyLogoUrl: data.companyLogoUrl || '',
    };
    speakers.push(newSpeaker);
    saveSpeakers(speakers);
    return newSpeaker;
  },

  // Simulate Sheet: Update Row
  updateSpeaker: async (id: string, data: Partial<Speaker>): Promise<Speaker> => {
    await delay(600);
    const speakers = getStoredSpeakers();
    const index = speakers.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Speaker not found");
    
    const updated = { ...speakers[index], ...data, lastUpdated: new Date().toISOString() };
    speakers[index] = updated;
    saveSpeakers(speakers);
    return updated;
  },

  // Simulate Drive: Upload Slides
  uploadSlides: async (file: File): Promise<string> => {
    await delay(1500); // Simulate upload time
    // Return a fake Drive URL
    return `https://docs.google.com/presentation/d/fake-id-${Date.now()}/edit`;
  },

  // Simulate Drive: Upload Image
  uploadImage: async (file: File): Promise<string> => {
    await delay(1000); // Simulate upload time
    // Return a local Object URL to simulate a hosted image
    return URL.createObjectURL(file);
  }
};