import React, { useEffect, useState } from 'react';
import apiFetch from '../services/api';

type EventItem = {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
};

export const Events: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // form state inside modal
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<EventItem[]>('/events');
      // Expecting an array; if object wrapper returned, try to extract `.events` or `.data`
      if (Array.isArray(res)) setEvents(res);
      else if ((res as any).events && Array.isArray((res as any).events)) setEvents((res as any).events);
      else if ((res as any).data && Array.isArray((res as any).data)) setEvents((res as any).data);
      else {
        console.warn('Unexpected /events response shape', res);
        setEvents([]);
      }
    } catch (e) {
      console.error('Failed to load events', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!title || !startTime || !endTime) {
      setError('Title, start time and end time are required');
      return;
    }

    const payload: EventItem = {
      title,
      description,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      location,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await apiFetch('/events/create', {
        method: 'POST',
        body: payload as any,
      });
      // Refresh list
      await loadEvents();
      setModalOpen(false);
      // clear form
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setLocation('');
    } catch (err: any) {
      console.error('Create event failed', err);
      setError(err?.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Events</h2>
        <div>
          <button onClick={() => setModalOpen(true)} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create Event</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div>Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-gray-500">No events yet.</div>
        ) : (
          events.map(ev => (
            <div key={ev.id ?? ev.title} className="bg-white p-4 rounded-lg shadow flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold">{ev.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{ev.description}</p>
                <p className="text-xs text-gray-500 mt-3">
                  {new Date(ev.start_time).toLocaleString()} — {new Date(ev.end_time).toLocaleString()}
                </p>
                {ev.location && <p className="text-xs text-gray-500">Location: {ev.location}</p>}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    // Navigate to admin dashboard and include event id as query param in hash
                    const id = ev.id ?? '';
                    window.location.hash = `admin?event=${encodeURIComponent(id)}`;
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Speakers
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl p-6 rounded shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Event</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-500">Close</button>
            </div>

            {error && <div className="text-red-700 bg-red-50 p-2 rounded mb-3">{error}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" rows={4} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
