import React, { useState } from 'react';
import { MockGoogleService } from '../services/mockGoogleService';
import apiFetch from '../services/api';
import { ArrowRight, CheckCircle2, Camera, UploadCloud, UserCircle, Building2, Loader2 } from 'lucide-react';
import { ImageCropper } from '../components/ImageCropper';

// Helper to read file as data url
const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result as string), false);
        reader.readAsDataURL(file);
    });
};

export const SpeakerIntake = ({ onComplete }: { onComplete: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [eventId, setEventId] = useState<string | null>(null);
    const [eventSummary, setEventSummary] = useState<any | null>(null);
    // Toast state for success / error notifications
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        companyName: '',
        companyRole: '',
        bio: '',
        talkTitle: '',
        talkDescription: '',
        profilePhotoUrl: '',
        companyLogoUrl: ''
    });

    // Cropper State
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'PROFILE' | 'COMPANY' | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Normalize fullName -> firstName/lastName and include eventId when creating
            const [firstName, ...rest] = (formData.fullName || '').trim().split(' ');
            const lastName = rest.join(' ');
            const payload = {
                firstName: firstName || '',
                lastName: lastName || '',
                email: formData.email,
                // include both server-expected keys and the normalized keys for compatibility
                company: formData.companyName,
                title: formData.companyRole,
                companyName: formData.companyName,
                companyRole: formData.companyRole,
                bio: formData.bio,
                talkTitle: formData.talkTitle,
                talkDescription: formData.talkDescription,
                headshotDriveUrl: formData.profilePhotoUrl,
                companyLogoDriveUrl: formData.companyLogoUrl,
                eventId: eventId || undefined,
            } as any;

            if (eventId) {
                // Post to the event-specific public intake endpoint
                // pass the payload object (apiFetch will JSON.stringify and set Content-Type)
                await apiFetch(`/events/${encodeURIComponent(eventId)}/speakers`, {
                    method: 'POST',
                    body: payload,
                });

                // show success toast but keep the user on the form
                setToast({ type: 'success', message: 'Registration submitted — thank you!' });
            } else {
                // fallback for local/dev: persist via mock service
                await MockGoogleService.createSpeaker(payload);
                setToast({ type: 'success', message: 'Registration saved locally (dev).' });
            }
            // invoke onComplete but don't navigate away; caller may clear modal or update state
            if (onComplete) onComplete();
        } catch (err) {
            console.error(err);
            // show failure toast
            setToast({ type: 'error', message: 'Submission failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'PROFILE' | 'COMPANY') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const imageDataUrl = await readFile(file);
            setCropImageSrc(imageDataUrl);
            setCropType(type);
            setShowCropper(true);
            e.target.value = ''; // Reset input
        } catch (e) {
            console.error("Error reading file", e);
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!cropType) return;
        setShowCropper(false);
        setUploadingImage(true);

        try {
            const file = new File([croppedBlob], `${cropType.toLowerCase()}_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const url = await MockGoogleService.uploadImage(file);

            if (cropType === 'PROFILE') {
                setFormData(prev => ({ ...prev, profilePhotoUrl: url }));
            } else {
                setFormData(prev => ({ ...prev, companyLogoUrl: url }));
            }
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setUploadingImage(false);
            setCropImageSrc(null);
            setCropType(null);
        }
    };

    // Read optional event id from hash query param so the intake can be event-specific
    React.useEffect(() => {
        try {
            const raw = window.location.hash || '';
            const cleaned = raw.replace(/^#\/?/, '');
            const [, query] = cleaned.split('?');
            if (!query) return;
            const params = new URLSearchParams(query);
            const id = params.get('event');
            if (id) setEventId(id);
        } catch (e) {
            // ignore
        }
    }, []);

    // Fetch event summary (use same endpoint the dashboard uses which returns { event, sheet_data })
    React.useEffect(() => {
        if (!eventId) return;
        let mounted = true;
        (async () => {
            try {
                const res = await apiFetch(`/events/${encodeURIComponent(eventId)}`);
                if (!mounted) return;
                // apiFetch may return either { event, sheet_data } or the event object itself
                setEventSummary(res.event);
            } catch (e) {
                // ignore fetch errors
            }
        })();
        return () => { mounted = false; };
    }, [eventId]);

    // Set page title to include event when present
    React.useEffect(() => {
        if (eventSummary) {
            const t = eventSummary.title || eventSummary.name || eventSummary.eventName || 'Event';
            document.title = `${t} — Speaker Registration`;
        } else {
            document.title = 'Speaker Registration';
        }
    }, [eventSummary]);

    // Auto-hide toast after a few seconds
    React.useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(id);
    }, [toast]);


    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
                <p className="text-gray-600">Your details have been saved to our system. Please check your email for login instructions to access the Speaker Portal.</p>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto">
            {eventSummary ? (
                <div className="mb-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-500">Registering for</div>
                    <h2 className="text-2xl font-bold text-gray-900">{eventSummary.title || eventSummary.name || eventSummary.eventName}</h2>
                    <div className="text-xs text-gray-500">
                        {eventSummary.date || eventSummary.start_date ? `Date: ${eventSummary.date || eventSummary.start_date}` : null}
                        {eventSummary.location ? ` • ${eventSummary.location}` : ''}
                    </div>
                    {eventSummary.description && <p className="mt-2 text-sm text-gray-600 max-w-2xl">{eventSummary.description}</p>}
                </div>
            ) : (
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900">Speaker Registration</h2>
                    <p className="text-gray-600 mt-2">Submit your details for the upcoming conference.</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Personal Details */}
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2 border-b border-gray-100 pb-2">
                        <UserCircle className="text-blue-500" size={20} />
                        <span>Personal Details</span>
                    </h3>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Photo Uploader */}
                        <div className="flex flex-col items-center space-y-3">
                            <div className="relative group w-32 h-32">
                                {formData.profilePhotoUrl ? (
                                    <img src={formData.profilePhotoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-gray-50 shadow-sm" />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                                        {uploadingImage && cropType === 'PROFILE' ? <Loader2 className="animate-spin" /> : <UserCircle size={48} />}
                                    </div>
                                )}
                                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg cursor-pointer transition-colors">
                                    <Camera size={16} />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'PROFILE')} disabled={uploadingImage} />
                                </label>
                            </div>
                            <span className="text-sm font-medium text-gray-500">Profile Photo</span>
                        </div>

                        {/* Fields */}
                        <div className="flex-1 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        required
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        type="text"
                                        placeholder="e.g. Jane Doe"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        required
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        type="email"
                                        placeholder="e.g. jane@company.com"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Speaker Bio</label>
                                <textarea
                                    required
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Company Details */}
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2 border-b border-gray-100 pb-2">
                        <Building2 className="text-blue-500" size={20} />
                        <span>Company Information</span>
                    </h3>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Logo Uploader */}
                        <div className="flex flex-col items-center space-y-3">
                            <div className="relative group w-32 h-32">
                                {formData.companyLogoUrl ? (
                                    <img src={formData.companyLogoUrl} alt="Company Logo" className="w-32 h-32 rounded-lg object-contain border border-gray-200 bg-gray-50" />
                                ) : (
                                    <div className="w-32 h-32 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                                        {uploadingImage && cropType === 'COMPANY' ? <Loader2 className="animate-spin" /> : <Building2 size={40} />}
                                    </div>
                                )}
                                <label className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg cursor-pointer transition-colors">
                                    <UploadCloud size={16} />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'COMPANY')} disabled={uploadingImage} />
                                </label>
                            </div>
                            <span className="text-sm font-medium text-gray-500">Company Logo</span>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input
                                    required
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role/Title</label>
                                <input
                                    required
                                    name="companyRole"
                                    value={formData.companyRole}
                                    onChange={handleChange}
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Talk Details */}
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2 border-b border-gray-100 pb-2">
                        <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">Tt</div>
                        <span>Session Details</span>
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Talk Title</label>
                            <input
                                required
                                name="talkTitle"
                                value={formData.talkTitle}
                                onChange={handleChange}
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Abstract / Description</label>
                            <textarea
                                required
                                name="talkDescription"
                                value={formData.talkDescription}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                placeholder="What will the audience learn?"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 pb-12">
                    <button
                        type="submit"
                        disabled={loading || uploadingImage}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 text-lg shadow-lg shadow-blue-200"
                    >
                        <span>{loading ? 'Submitting...' : 'Complete Registration'}</span>
                        {!loading && <ArrowRight size={20} />}
                    </button>
                </div>
            </form>

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
            {/* Toast */}
            {toast && (
                <div className={`fixed right-6 bottom-6 z-50 max-w-sm w-full`}>
                    <div className={`px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
};