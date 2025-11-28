import React, { useEffect, useState } from 'react';
import { User, Speaker, SpeakerStatus } from '../types';
import { MockGoogleService } from '../services/mockGoogleService';
import { UploadCloud, FileText, Save, Loader2, Camera, Building2, UserCircle } from 'lucide-react';
import { ImageCropper } from '../components/ImageCropper';

// Helper to read file as data url
const readFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string), false);
    reader.readAsDataURL(file);
  });
};

export const SpeakerPortal = ({ user }: { user: User }) => {
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSlides, setUploadingSlides] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'PROFILE' | 'COMPANY' | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadSpeaker();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSpeaker = async () => {
    if (!user) return;
    try {
      const data = await MockGoogleService.getSpeakerById(user.id);
      if (data) setSpeaker(data);
    } catch (error) {
      console.error("Failed to load speaker data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speaker) return;
    setSaving(true);
    try {
      // Upon edit, reset status to PENDING_REVIEW if it was APPROVED
      const newStatus = speaker.status === SpeakerStatus.APPROVED ? SpeakerStatus.PENDING_REVIEW : speaker.status;
      await MockGoogleService.updateSpeaker(speaker.id, { 
          ...speaker,
          status: newStatus
      });
      await loadSpeaker();
    } finally {
      setSaving(false);
    }
  };

  const handleSlidesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !speaker) return;

    setUploadingSlides(true);
    try {
      const url = await MockGoogleService.uploadSlides(file);
      await MockGoogleService.updateSpeaker(speaker.id, { 
          slidesUrl: url,
          status: SpeakerStatus.PENDING_REVIEW 
      });
      setSpeaker(prev => prev ? ({ ...prev, slidesUrl: url, status: SpeakerStatus.PENDING_REVIEW }) : null);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingSlides(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'PROFILE' | 'COMPANY') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageDataUrl = await readFile(file);
      setCropImageSrc(imageDataUrl);
      setCropType(type);
      setShowCropper(true);
      // Reset input value to allow selecting same file again if needed
      e.target.value = ''; 
    } catch (e) {
      console.error("Error reading file", e);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!speaker || !cropType) return;
    setShowCropper(false);

    const setUploading = cropType === 'PROFILE' ? setUploadingPhoto : setUploadingLogo;
    setUploading(true);

    try {
        // Convert Blob to File
        const file = new File([croppedBlob], `${cropType.toLowerCase()}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        const url = await MockGoogleService.uploadImage(file);
        const updateData = cropType === 'PROFILE' 
          ? { profilePhotoUrl: url } 
          : { companyLogoUrl: url };
          
        await MockGoogleService.updateSpeaker(speaker.id, {
            ...updateData,
            status: SpeakerStatus.PENDING_REVIEW
        });
        setSpeaker(prev => prev ? ({ ...prev, ...updateData, status: SpeakerStatus.PENDING_REVIEW }) : null);
    } catch (err) {
        console.error(err);
    } finally {
        setUploading(false);
        setCropImageSrc(null);
        setCropType(null);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading your profile...</div>;
  if (!speaker) return <div className="p-10 text-center text-red-500">Speaker profile not found.</div>;

  const StatusBadge = ({ status }: { status: SpeakerStatus }) => {
      const colors = {
          [SpeakerStatus.DRAFT]: 'bg-gray-100 text-gray-800',
          [SpeakerStatus.PENDING_REVIEW]: 'bg-yellow-100 text-yellow-800',
          [SpeakerStatus.APPROVED]: 'bg-green-100 text-green-800',
          [SpeakerStatus.REJECTED]: 'bg-red-100 text-red-800',
          [SpeakerStatus.CHANGES_REQUESTED]: 'bg-orange-100 text-orange-800',
      };
      return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome, {speaker.fullName}</h1>
              <p className="text-gray-500 text-sm mt-1">Manage your speaker profile, company details, and session materials.</p>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-xs text-gray-400 mb-1">Current Status</span>
               <StatusBadge status={speaker.status} />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleUpdate} className="space-y-6">
                  
                  {/* Speaker Profile Section */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                          <UserCircle className="text-blue-500" size={20} />
                          <span>Speaker Profile</span>
                      </h3>
                      
                      <div className="flex flex-col md:flex-row gap-6 mb-6">
                          <div className="flex-shrink-0">
                               <div className="relative group w-24 h-24">
                                  {speaker.profilePhotoUrl ? (
                                      <img src={speaker.profilePhotoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-gray-100" />
                                  ) : (
                                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                                          <UserCircle size={40} />
                                      </div>
                                  )}
                                  <label className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors z-10">
                                      {uploadingPhoto ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} className="text-gray-600" />}
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'PROFILE')} disabled={uploadingPhoto} />
                                  </label>
                              </div>
                          </div>
                          <div className="flex-1 space-y-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                                  <textarea 
                                      rows={3}
                                      value={speaker.bio}
                                      onChange={e => setSpeaker({...speaker, bio: e.target.value})}
                                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Company Information Section */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                          <Building2 className="text-blue-500" size={20} />
                          <span>Company Information</span>
                      </h3>
                      <div className="flex flex-col md:flex-row gap-6">
                           <div className="flex-shrink-0">
                               <div className="relative group w-24 h-24">
                                  {speaker.companyLogoUrl ? (
                                      <img src={speaker.companyLogoUrl} alt="Company Logo" className="w-24 h-24 rounded-lg object-contain border border-gray-200 bg-gray-50" />
                                  ) : (
                                      <div className="w-24 h-24 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                                          <Building2 size={32} />
                                      </div>
                                  )}
                                  <label className="absolute bottom-[-8px] right-[-8px] bg-white rounded-full p-1.5 shadow-md border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors z-10">
                                      {uploadingLogo ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} className="text-gray-600" />}
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'COMPANY')} disabled={uploadingLogo} />
                                  </label>
                              </div>
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                                  <input 
                                      value={speaker.companyName}
                                      onChange={e => setSpeaker({...speaker, companyName: e.target.value})}
                                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700">Role / Title</label>
                                  <input 
                                      value={speaker.companyRole}
                                      onChange={e => setSpeaker({...speaker, companyRole: e.target.value})}
                                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Session Details Section */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                          <FileText className="text-blue-500" size={20} />
                          <span>Session Details</span>
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Talk Title</label>
                              <input 
                                  value={speaker.talkTitle}
                                  onChange={e => setSpeaker({...speaker, talkTitle: e.target.value})}
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Abstract / Description</label>
                              <textarea 
                                  rows={6}
                                  value={speaker.talkDescription}
                                  onChange={e => setSpeaker({...speaker, talkDescription: e.target.value})}
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end pt-4">
                      <button 
                          type="submit" 
                          disabled={saving}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-base font-medium"
                      >
                          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                          <span>Save All Changes</span>
                      </button>
                  </div>
              </form>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <UploadCloud size={20} className="text-blue-500"/>
                      <span>Slides & Materials</span>
                  </h3>
                  
                  {speaker.slidesUrl ? (
                      <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                          <p className="text-sm text-green-800 font-medium mb-2">Slides Uploaded</p>
                          <a href={speaker.slidesUrl} target="_blank" rel="noreferrer" className="text-xs text-green-600 underline truncate block hover:text-green-700">
                              View on Google Drive
                          </a>
                      </div>
                  ) : (
                      <div className="mb-4 p-4 bg-gray-50 border border-gray-100 rounded-lg text-center">
                          <p className="text-sm text-gray-500">No slides uploaded yet.</p>
                      </div>
                  )}

                  <label className={`
                      flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                      ${uploadingSlides ? 'bg-gray-50 border-gray-300' : 'border-blue-300 hover:bg-blue-50'}
                  `}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadingSlides ? (
                              <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
                          ) : (
                              <UploadCloud className="text-blue-500 mb-2" size={24} />
                          )}
                          <p className="text-sm text-gray-500">{uploadingSlides ? 'Uploading to Drive...' : 'Upload .pptx / PDF'}</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.pptx,.ppt" onChange={handleSlidesUpload} disabled={uploadingSlides} />
                  </label>
                  
                  <div className="mt-4 text-xs text-gray-400">
                      <p>Supported formats: PPTX, PDF</p>
                      <p>Max file size: 50MB</p>
                  </div>
              </div>
          </div>
        </div>
      </div>

      {showCropper && cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCancel={() => {
            setShowCropper(false);
            setCropImageSrc(null);
            setCropType(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={1}
        />
      )}
    </>
  );
};