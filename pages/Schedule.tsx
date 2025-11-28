import React, { useEffect, useState } from 'react';
import { Speaker, SpeakerStatus } from '../types';
import { MockGoogleService } from '../services/mockGoogleService';
import { Calendar, Clock, MapPin } from 'lucide-react';

export const Schedule = () => {
  const [schedule, setSchedule] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const all = await MockGoogleService.getSpeakers();
      // Filter only approved speakers for public schedule
      setSchedule(all.filter(s => s.status === SpeakerStatus.APPROVED));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading schedule...</div>;

  return (
    <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Event Schedule</h1>
            <p className="text-lg text-gray-600">Join us for a day of innovation and inspiration.</p>
        </div>

        <div className="space-y-6">
            {schedule.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-500">No sessions scheduled yet. Check back soon!</p>
                </div>
            ) : (
                schedule.map((session, index) => (
                    <div key={session.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                            {/* Time Column */}
                            <div className="flex-shrink-0 flex md:flex-col items-center md:items-start space-x-4 md:space-x-0 md:space-y-2 mb-4 md:mb-0 w-32">
                                <div className="flex items-center text-blue-600 font-bold text-lg">
                                    <Clock size={18} className="mr-2" />
                                    <span>{9 + index}:00 AM</span>
                                </div>
                                <div className="text-sm text-gray-500">60 Minutes</div>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{session.talkTitle}</h3>
                                <p className="text-gray-600 mb-4">{session.talkDescription}</p>
                                
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {session.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{session.fullName}</p>
                                            <p className="text-xs text-gray-500">{session.companyName}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             {/* Location */}
                             <div className="hidden md:flex flex-col items-end text-right pl-4 border-l border-gray-100">
                                <div className="flex items-center text-gray-500 text-sm mb-1">
                                    <MapPin size={14} className="mr-1" />
                                    <span>Main Stage</span>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Live
                                </span>
                             </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};
