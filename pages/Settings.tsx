import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

type Team = {
  id?: string | null;
  name: string;
  description?: string | null;
  created_at?: string | null;
  created_by?: string | null;
};

const InitializeDriveButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInitialize = async () => {
    setLoading(true);
    setError(null);
    setShowSuccess(false);
    try {
      await apiFetch('/google/drive/initialize', { method: 'GET' });
      // show a small transient positive toast, don't display API response body
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e: any) {
      console.error('Drive initialize failed', e);
      setError(e?.message || 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-right">
      <button
        onClick={handleInitialize}
        disabled={loading}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? 'Initializing…' : 'Initialize Drive'}
      </button>
      {showSuccess && <div className="text-sm text-green-600 mt-2">Drive initialized</div>}
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
    </div>
  );
};

function truncate(text: string | null | undefined, max = 50) {
  if (text == null) return '';
  const s = String(text);
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

export const Settings: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<Array<{ id: string; name: string }>>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any[] | null>(null);
  const [sheetColumns, setSheetColumns] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setSheetsLoading(true);
      setSheetsError(null);

      try {
        const [teamResp, sheetsResp] = await Promise.all([
          apiFetch<any>('/team'),
          apiFetch<any>('/google/drive/sheets')
        ]);

        // teams normalization
        if (Array.isArray(teamResp)) {
          setTeams(teamResp);
        } else if (teamResp && typeof teamResp === 'object' && (teamResp.id || teamResp.name)) {
          setTeams([teamResp as Team]);
        } else {
          console.warn('Unexpected /team response shape', teamResp);
          setTeams([]);
          setError('Unexpected response from server when loading teams');
        }

        // sheets normalization — backend returns { spreadsheets: [...] }
        let normalizedSheets: Array<{ id: string; name: string }> = [];
        if (sheetsResp && Array.isArray(sheetsResp.spreadsheets)) {
          normalizedSheets = sheetsResp.spreadsheets;
        } else {
          console.warn('Unexpected /google/drive/sheets response shape - expected { spreadsheets: [...] }', sheetsResp);
          setSheetsError('Unexpected response shape from server when loading sheets');
        }

  setSheets(normalizedSheets.map(s => ({ id: String(s.id), name: String(s.name) })));
  if (normalizedSheets.length > 0) setSelectedSheet(String(normalizedSheets[0].id));

      } catch (e: any) {
        console.error(e);
        setError(prev => prev || (e?.message || 'Failed to load teams'));
        setSheetsError(e?.message || 'Failed to load sheets');
      } finally {
        setLoading(false);
        setSheetsLoading(false);
      }
    })();
  }, []);

  // Fetch selected sheet contents
  useEffect(() => {
    if (!selectedSheet) {
      setSheetData(null);
      setSheetColumns(null);
      setSheetError(null);
      return;
    }

    (async () => {
      setSheetLoading(true);
      setSheetError(null);
      setSheetData(null);
      setSheetColumns(null);
      try {
        const resp = await apiFetch<any>(`/google/drive/sheet/${encodeURIComponent(selectedSheet)}`);

        // Normalize shapes:
        // 1) array of objects => use keys as columns
        // 2) array of arrays => first row as header
        // 3) { values: [...] } => values array
        if (Array.isArray(resp) && resp.length > 0 && typeof resp[0] === 'object' && !Array.isArray(resp[0])) {
          setSheetData(resp);
          setSheetColumns(Object.keys(resp[0]));
        } else if (Array.isArray(resp) && resp.length > 0 && Array.isArray(resp[0])) {
          // array of arrays: first row header
          const [header, ...rows] = resp;
          const cols = header.map((h: any, i: number) => (h ? String(h) : `col_${i}`));
          const mapped = rows.map((r: any[]) => {
            const obj: any = {};
            cols.forEach((c, i) => (obj[c] = r[i]));
            return obj;
          });
          setSheetColumns(cols);
          setSheetData(mapped);
        } else if (resp && Array.isArray(resp.values)) {
          const [header, ...rows] = resp.values;
          const cols = header.map((h: any, i: number) => (h ? String(h) : `col_${i}`));
          const mapped = rows.map((r: any[]) => {
            const obj: any = {};
            cols.forEach((c, i) => (obj[c] = r[i]));
            return obj;
          });
          setSheetColumns(cols);
          setSheetData(mapped);
        } else if (resp && resp.sheet_info && Array.isArray(resp.sheet_info.values)) {
          const values = resp.sheet_info.values;
          if (values.length === 0) {
            setSheetError('Sheet is empty');
          } else {
            const [header, ...rows] = values;
            const cols = header.map((h: any, i: number) => (h ? String(h) : `col_${i}`));
            const mapped = rows.map((r: any[]) => {
              const obj: any = {};
              cols.forEach((c, i) => (obj[c] = r[i]));
              return obj;
            });
            setSheetColumns(cols);
            setSheetData(mapped);
          }
        } else {
          // unknown shape — attempt to render if it's an object with rows
          console.warn('Unexpected /sheet response shape', resp);
          if (resp && Array.isArray(resp.data)) {
            setSheetData(resp.data);
            if (resp.data.length > 0 && typeof resp.data[0] === 'object') setSheetColumns(Object.keys(resp.data[0]));
          } else {
            setSheetError('Unexpected sheet data format');
          }
        }
      } catch (e: any) {
        console.error('Failed to load sheet', e);
        setSheetError(e?.message || 'Failed to load sheet');
      } finally {
        setSheetLoading(false);
      }
    })();
  }, [selectedSheet]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-sm text-gray-500">Team configuration and metadata</p>
        </div>
        <div className="ml-4">
          {/* Initialize Drive button */}
          <InitializeDriveButton />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4">
        {/* Sheets selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Google Sheets</label>
          {sheetsLoading ? (
            <p className="text-sm text-gray-500">Loading sheets…</p>
          ) : sheetsError ? (
            <p className="text-sm text-red-600">{sheetsError}</p>
          ) : (
            <select
              value={selectedSheet ?? ''}
              onChange={(e) => setSelectedSheet(e.target.value || null)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
            >
              {sheets.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Sheet contents preview */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Sheet preview</label>
          {sheetLoading ? (
            <p className="text-sm text-gray-500">Loading sheet…</p>
          ) : sheetError ? (
            <p className="text-sm text-red-600">{sheetError}</p>
          ) : sheetData && sheetData.length > 0 ? (
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-left table-auto">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    {(sheetColumns || Object.keys(sheetData[0] || {})).map((col) => (
                      <th key={col} className="px-3 py-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {(sheetColumns || Object.keys(row || {})).map((col, ci) => {
                        const raw = typeof row === 'object' ? row[col] ?? '' : (row[col] ?? '');
                        const rawStr = String(raw ?? '');
                        const display = truncate(rawStr, 50);
                        const isLink = /https?:\/\//i.test(rawStr);
                        return (
                          <td key={ci} className="px-3 py-3 text-sm text-gray-600" title={rawStr}>
                            {isLink ? (
                              <a href={rawStr} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                {display}
                              </a>
                            ) : (
                              display
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No sheet selected or no data available.</p>
          )}
        </div>

        {/* Teams table */}
        <div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading teams…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : teams.length === 0 ? (
            <p className="text-sm text-gray-500">No teams found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left table-auto">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id || t.name} className="border-t border-gray-100">
                      <td className="px-3 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{t.description || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
