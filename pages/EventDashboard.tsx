import React, { useEffect, useState } from 'react';
import { Speaker, SpeakerStatus } from '../types';
import { MockGoogleService } from '../services/mockGoogleService';
import apiFetch from '../services/api';
import { mapRowToSpeaker } from '../services/speakerMapper';
import { Check, X, Eye, Loader2, AlertTriangle, FileText, RefreshCw, Copy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ShareIntakeButton = ({ eventId }: { eventId?: string }) => {
    const [copied, setCopied] = React.useState(false);
    const handleShare = async () => {
        if (!eventId) return;
        const url = `${window.location.origin}/#/speaker-intake?event=${encodeURIComponent(eventId)}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            console.error('Copy failed', e);
        }
    };

    return (
        <button onClick={handleShare} className="mt-2 md:mt-0 px-3 py-2 text-gray-500 hover:text-gray-900 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center space-x-2">
            <Copy size={16} />
            <span className="text-sm">{copied ? 'Link copied' : 'Share intake'}</span>
        </button>
    );
};

export const EventDashboard = () => {
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
    const [eventSummary, setEventSummary] = useState<any | null>(null);

    // Read optional event id from hash query param
    const getEventIdFromHash = () => {
        const raw = window.location.hash || '';
        const cleaned = raw.replace(/^#\/?/, '');
        const [, query] = cleaned.split('?');
        if (!query) return null;
        const params = new URLSearchParams(query);
        return params.get('event');
    };

    const ShareIntakeButton = ({ eventId }: { eventId?: string }) => {
            const [copied, setCopied] = React.useState(false);
            const handleShare = async () => {
                if (!eventId) return;
                const url = `${window.location.origin}/#/speaker-intake?event=${encodeURIComponent(eventId)}`;
                try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                } catch (e) {
                    console.error('Copy failed', e);
                }
            };

            return (
                <button onClick={handleShare} className="mt-2 md:mt-0 px-3 py-2 text-gray-500 hover:text-gray-900 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center space-x-2">
                    <Copy size={16} />
                    <span className="text-sm">{copied ? 'Link copied' : 'Share intake'}</span>
                </button>
            );
        };
    useEffect(() => {
        const id = getEventIdFromHash();
        if (id) {
            loadEventSpeakers(id);
        } else {
            loadSpeakers();
        }
        // listen for hash changes so admin can click different cards
        const onHash = () => {
            const newId = getEventIdFromHash();
            if (newId) loadEventSpeakers(newId);
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    // Set document title when eventSummary becomes available
    useEffect(() => {
        if (eventSummary) {
            const title = eventSummary.title || eventSummary.name || eventSummary.eventName || 'Event';
            document.title = `${title} — Admin Dashboard`;
        } else {
            document.title = 'Admin Dashboard';
        }
    }, [eventSummary]);

    const loadSpeakers = async () => {
        const data = await MockGoogleService.getSpeakers();
        setSpeakers(data);
    };

    const loadEventSpeakers = async (eventId: string) => {
        try {
            const res = await apiFetch(`/events/${encodeURIComponent(eventId)}/speakers`);
            // Expected shape: { event: {...}, sheet_data: { values: [...] } }
            if (res && res.sheet_data && Array.isArray(res.sheet_data.values)) {
                const values: any[][] = res.sheet_data.values;
                // first row is header
                const headers = values[0] || [];
                const rows = values.slice(1);
                const parsed: Speaker[] = rows.map((r: any[]) => {
                    const obj: any = {};
                    headers.forEach((h: string, i: number) => obj[h] = r[i] ?? '');
                    const s = mapRowToSpeaker(obj);
                    // derive overall status if not set
                    s.status = (obj.speaker_asset_status === 'Both Approved' || obj.website_card_status === 'Approved') ? SpeakerStatus.APPROVED : SpeakerStatus.PENDING_REVIEW;
                    return s;
                });
                setSpeakers(parsed);
            } else {
                console.warn('Unexpected speakers payload', res);
                setSpeakers([]);
            }
            if (res && res.event) setEventSummary(res.event);
        } catch (e) {
            console.error('Failed to load event speakers', e);
            setSpeakers([]);
        }
    };

    const handleStatusChange = async (id: string, status: SpeakerStatus) => {
        await MockGoogleService.updateSpeaker(id, { status });
        await loadSpeakers();
        if (selectedSpeaker?.id === id) {
            setSelectedSpeaker(prev => prev ? ({ ...prev, status }) : null);
        }
    };

    // Stats for chart
    const statusCounts = speakers.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.keys(statusCounts).map(key => ({
        name: key.replace('_', ' '),
        value: statusCounts[key]
    }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{eventSummary ? (eventSummary.title || eventSummary.name || eventSummary.eventName) : 'Admin Dashboard'}</h1>
                    {eventSummary && (
                        <div className="mt-2 text-sm text-gray-600">
                            <div className="text-xs text-gray-500">
                                {eventSummary.date || eventSummary.start_date || eventSummary.eventDate ? `Date: ${eventSummary.date || eventSummary.start_date || eventSummary.eventDate}` : null}
                                {eventSummary.location ? ` • ${eventSummary.location}` : ''}
                            </div>
                            {eventSummary.description && <div className="mt-1 text-xs text-gray-500 max-w-xl">{eventSummary.description}</div>}
                        </div>
                    )}
                </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={loadSpeakers} className="mt-2 md:mt-0 p-2 text-gray-500 hover:text-gray-900 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <RefreshCw size={18} />
                                </button>
                                {eventSummary && (
                                    <ShareIntakeButton eventId={eventSummary.id || eventSummary.eventId || eventSummary._id} />
                                )}
                            </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">

                {/* Left Column: List & Chart */}
                <div className="lg:col-span-1 space-y-6 flex flex-col h-full overflow-hidden">
                    {/* Mini Chart */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-48 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Submission Status</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-auto">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-700">Speakers ({speakers.length})</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {speakers.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => setSelectedSpeaker(s)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSpeaker?.id === s.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900">{`${s.firstName} ${s.lastName}`}</p>
                                            <p className="text-xs text-gray-500 truncate w-40">{s.companyRole || s.companyName}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${s.status === SpeakerStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                                s.status === SpeakerStatus.PENDING_REVIEW ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {s.status.split('_')[0]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Detail View */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm h-full overflow-auto p-8 relative">
                    {selectedSpeaker ? (
                        <div className="space-y-8">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{`${selectedSpeaker.firstName} ${selectedSpeaker.lastName}`}</h2>
                                    <p className="text-lg text-gray-600 mt-1">{selectedSpeaker.companyRole || selectedSpeaker.companyName}</p>
                                    <div className="mt-2 text-sm text-gray-500">Submitted: {new Date(selectedSpeaker.submissionDate).toLocaleDateString()}</div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleStatusChange(selectedSpeaker.id, SpeakerStatus.REJECTED)}
                                        className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(selectedSpeaker.id, SpeakerStatus.APPROVED)}
                                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm"
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Description</h3>
                                        <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">{selectedSpeaker.bio}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Bio</h3>
                                        <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">{selectedSpeaker.bio}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Materials */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                                            <FileText size={16} />
                                            <span>Materials</span>
                                        </h3>

                                        {/* Headshot */}
                                        <div className="mb-3">
                                            <div className="text-xs text-gray-600 mb-1">Headshot</div>
                                            {selectedSpeaker.headshotDriveUrl ? (
                                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <div className="flex items-center space-x-2 text-green-800">
                                                        <Check size={16} />
                                                        <span className="text-sm font-medium">Uploaded</span>
                                                    </div>
                                                    <a href={selectedSpeaker.headshotDriveUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                                                        <Eye size={12} className="mr-1" /> View
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-100 text-orange-800">
                                                    <AlertTriangle size={16} />
                                                    <span className="text-sm">No headshot uploaded</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Company Logo */}
                                        <div className="mb-3">
                                            <div className="text-xs text-gray-600 mb-1">Company Logo</div>
                                            {selectedSpeaker.companyLogoDriveUrl ? (
                                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <div className="flex items-center space-x-2 text-green-800">
                                                        <Check size={16} />
                                                        <span className="text-sm font-medium">Uploaded</span>
                                                    </div>
                                                    <a href={selectedSpeaker.companyLogoDriveUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                                                        <Eye size={12} className="mr-1" /> View
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-100 text-orange-800">
                                                    <AlertTriangle size={16} />
                                                    <span className="text-sm">No logo uploaded</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Website Card */}
                                        <div className="mb-3">
                                            <div className="text-xs text-gray-600 mb-1">Website Card</div>
                                            {selectedSpeaker.websiteCardUrl ? (
                                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <div className="flex items-center space-x-2 text-green-800">
                                                        <Check size={16} />
                                                        <span className="text-sm font-medium">Available</span>
                                                    </div>
                                                    <a href={selectedSpeaker.websiteCardUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                                                        <Eye size={12} className="mr-1" /> View
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-100 text-orange-800">
                                                    <AlertTriangle size={16} />
                                                    <span className="text-sm">No website card</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Promo Card */}
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Promo Card</div>
                                            {selectedSpeaker.promoCardUrl ? (
                                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <div className="flex items-center space-x-2 text-green-800">
                                                        <Check size={16} />
                                                        <span className="text-sm font-medium">Available</span>
                                                    </div>
                                                    <a href={selectedSpeaker.promoCardUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                                                        <Eye size={12} className="mr-1" /> View
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-100 text-orange-800">
                                                    <AlertTriangle size={16} />
                                                    <span className="text-sm">No promo card</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                            <FileText size={48} className="opacity-20" />
                            <p>Select a speaker to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};