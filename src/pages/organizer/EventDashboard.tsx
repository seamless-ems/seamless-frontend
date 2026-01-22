import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EventDashboard() {
	const { id } = useParams();

	const { data: rawEvent, isLoading, error } = useQuery<any, Error>({
		queryKey: ["event", id],
		queryFn: () => getJson<any>(`/events/${id}`),
		enabled: Boolean(id),
	});

	// Normalize API response (snake_case fields, modules array) into a shape the UI expects
	const event = (() => {
		if (!rawEvent) return null;

		return {
			...rawEvent,
			title: rawEvent.title,
			status: rawEvent.status,
			speakerCount: (Array.isArray(rawEvent.speakers) ? rawEvent.speakers.length : undefined) ?? rawEvent.speaker_count ?? rawEvent.speakers_count ?? 0,
			// keep modules as array; we'll map to the shape we need below
			modules: Array.isArray(rawEvent.modules)
				? rawEvent.modules
				: rawEvent.modules && typeof rawEvent.modules === "object"
					? // support { speaker: true, schedule: false } and richer objects
					Object.entries(rawEvent.modules).map(([name, val]) => (typeof val === "object" ? { name, ...(val as any) } : { name, enabled: !!val }))
					: [],
		};
	})();

	// Build a modules map from modules array for backward compatibility with the UI
	const modules = (() => {
		const map: Record<string, any> = {};
		(event?.modules ?? []).forEach((m: any) => {
			const key = m.name || m.id;
			map[key] = {
				enabled: !!m.enabled,
				// copy over other possible properties
				...m,
			};
		});

		return {
			speaker: map.speaker ?? { enabled: false, submitted: 0 },
			schedule: map.schedule ?? { enabled: false, sessions: 0 },
			content: map.content ?? { enabled: false },
			partners: map.partners ?? { enabled: false },
			attendee: map.attendee ?? { enabled: false },
			app: map.app ?? { enabled: false },
		};
	})();

	if (isLoading) {
		return <div className="py-16 text-center">Loading event…</div>;
	}

	if (error) {
		return <div className="py-16 text-center text-destructive">Error loading event: {String(error.message)}</div>;
	}

	// Get list of enabled modules
	const enabledModules = (event?.modules ?? []).filter((m: any) => m.enabled).map((m: any) => m.name || m.id);

	// All available modules for the button bar
	const allModules = [
		{ id: 'speaker', name: 'Speakers', url: `/organizer/event/${id}/speakers`, available: true },
		{ id: 'schedule', name: 'Schedule', url: '#', available: true },
		{ id: 'content', name: 'Content', url: '#', available: true },
		{ id: 'partners', name: 'Partners', url: '#', available: true },
		{ id: 'attendee', name: 'Attendees', url: '#', available: false, comingSoon: true },
	];

	return (
		<div>
			{/* Module Navigation Buttons */}
			<div className="mb-6">
				<h3 style={{ fontSize: 'var(--font-body)', fontWeight: 600, marginBottom: '12px' }} className="text-muted-foreground">
					Modules
				</h3>
				<div className="flex flex-wrap gap-3">
					{allModules.map((module) => {
					const isEnabled = enabledModules.includes(module.id);
					const isClickable = isEnabled && module.id === 'speaker'; // Only speaker is functional for now

					if (isClickable) {
						return (
							<Button
								key={module.id}
								variant="outline"
								size="sm"
								asChild
								className="border-primary border-2"
							>
								<Link to={module.url}>{module.name}</Link>
							</Button>
						);
					}

					return (
						<Button
							key={module.id}
							variant="outline"
							size="sm"
							disabled={!isEnabled}
							className={isEnabled ? "border-primary border-2" : "opacity-40"}
						>
							{module.name}
							{module.comingSoon && (
								<Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5 h-4">Soon</Badge>
							)}
						</Button>
					);
				})}
				</div>
			</div>

			<h2 style={{ fontSize: 'var(--font-h2)', fontWeight: 600, marginBottom: '24px' }}>
				Event Dashboard
			</h2>

			{/* Module Summary Cards */}
			<div className="space-y-6">
				{/* Speaker Module */}
				{enabledModules.includes('speaker') && (
					<div className="rounded-lg border border-border bg-card p-6">
						<div className="flex justify-between items-center mb-5 pb-4 border-b border-border">
							<h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Speakers</h3>
							<Button variant="outline" size="sm" asChild>
								<Link to={`/organizer/event/${id}/speakers`}>View Module</Link>
							</Button>
						</div>

						<div className="grid grid-cols-4 gap-6 mb-5">
							<div>
								<div style={{ fontSize: 'var(--font-small)' }} className="text-muted-foreground mb-1">
									Total Speakers
								</div>
								<div className="text-2xl font-semibold">{event?.speakerCount ?? 0}</div>
							</div>
							<div>
								<div style={{ fontSize: 'var(--font-small)' }} className="text-muted-foreground mb-1">
									Approved
								</div>
								<div className="text-2xl font-semibold text-success">0</div>
								<div style={{ fontSize: 'var(--font-small)' }} className="text-muted-foreground">0%</div>
							</div>
							<div>
								<div style={{ fontSize: 'var(--font-small)' }} className="text-muted-foreground mb-1">
									Pending Review
								</div>
								<div className="text-2xl font-semibold text-warning">0</div>
							</div>
							<div>
								<div style={{ fontSize: 'var(--font-small)' }} className="text-muted-foreground mb-1">
									Applications
								</div>
								<div className="text-2xl font-semibold">0</div>
								<div style={{ fontSize: 'var(--font-small)' }} className="text-muted-foreground">0 pending</div>
							</div>
						</div>

						<div className="p-3 bg-primary/5 rounded-md border-l-4 border-primary">
							<div className="font-semibold mb-1" style={{ fontSize: 'var(--font-body)' }}>
								Published Embeds
							</div>
							<div style={{ fontSize: 'var(--font-small)', lineHeight: '1.6' }} className="text-muted-foreground">
								• All Speakers: 0 speakers live<br />
								• Newsletter Feature: 0 speakers live<br />
								• 0 approved speakers not yet published
							</div>
						</div>
					</div>
				)}

				{/* Schedule Module */}
				{enabledModules.includes('schedule') && (
					<div className="rounded-lg border border-border bg-card p-6">
						<div className="flex justify-between items-center mb-5 pb-4 border-b border-border">
							<h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Schedule</h3>
							<Button variant="outline" size="sm" disabled>
								View Module
							</Button>
						</div>
						<div style={{ fontSize: 'var(--font-body)' }} className="text-muted-foreground">
							Schedule module data will appear here once configured
						</div>
					</div>
				)}

				{/* Content Module */}
				{enabledModules.includes('content') && (
					<div className="rounded-lg border border-border bg-card p-6">
						<div className="flex justify-between items-center mb-5 pb-4 border-b border-border">
							<h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Content</h3>
							<Button variant="outline" size="sm" disabled>
								View Module
							</Button>
						</div>
						<div style={{ fontSize: 'var(--font-body)' }} className="text-muted-foreground">
							Content module data will appear here once configured
						</div>
					</div>
				)}

				{/* Partners Module */}
				{enabledModules.includes('partners') && (
					<div className="rounded-lg border border-border bg-card p-6">
						<div className="flex justify-between items-center mb-5 pb-4 border-b border-border">
							<h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Partners</h3>
							<Button variant="outline" size="sm" disabled>
								View Module
							</Button>
						</div>
						<div style={{ fontSize: 'var(--font-body)' }} className="text-muted-foreground">
							Partners module data will appear here once configured
						</div>
					</div>
				)}
			</div>
		</div>
	);
}