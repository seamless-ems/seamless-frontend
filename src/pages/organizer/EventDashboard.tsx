import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Calendar,
	MapPin,
	Mic2,
	Users,
	FileText,
	Settings,
	Link as LinkIcon,
	Mail,
	ExternalLink,
} from "lucide-react";



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
		// Format dates
		const formatDate = (iso?: string) => {
			try {
				return iso ? new Date(iso).toLocaleDateString() : "";
			} catch {
				return "";
			}
		};

		const start = formatDate(rawEvent.start_date);
		const end = formatDate(rawEvent.end_date);
		const dates = start && end ? `${start} — ${end}` : start || end || "";

		return {
			...rawEvent,
			title: rawEvent.title,
			status: rawEvent.status,
			dates,
			location: rawEvent.location,
			speakerCount: (Array.isArray(rawEvent.speakers) ? rawEvent.speakers.length : undefined) ?? rawEvent.speaker_count ?? rawEvent.speakers_count ?? 0,
			attendeeCount: rawEvent.attendee_count ?? 0,
			fromEmail: rawEvent.from_email ?? rawEvent.fromEmail,
			googleDriveConnected: rawEvent.google_drive_connected ?? false,
			rootFolder: rawEvent.root_folder ?? rawEvent.rootFolder ?? "",
			eventImage: rawEvent.event_image ?? rawEvent.eventImage ?? null,
			// keep modules as array; we'll map to the shape we need below
			modules: Array.isArray(rawEvent.modules)
				? rawEvent.modules
				: rawEvent.modules && typeof rawEvent.modules === "object"
				? Object.entries(rawEvent.modules).map(([name, val]) => ({ name, ...(val as any) }))
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

	return (
		<div className="space-y-8">
			{/* Event Header */}
			<div className="relative rounded-xl border border-border bg-card p-6 shadow-soft">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<h1 className="font-display text-3xl font-bold text-foreground">
								{event?.title ?? "Untitled Event"}
							</h1>
							{((event as any)?.eventImage || (event as any)?.event_image || (event as any)?.image) ? (
								<img
									src={(event as any)?.eventImage ?? (event as any)?.event_image ?? (event as any)?.image}
									alt={event?.title ?? "Event image"}
									className="pointer-events-none absolute top-6 right-6 h-24 w-36 rounded-md object-cover shadow-md z-10"
								/>
							) : null}
						</div>

						<div className="flex flex-wrap items-center gap-4 text-muted-foreground">
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								<span>{event?.dates}</span>
							</div>
							<div className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								<span>{event?.location}</span>
							</div>
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4" />
								<span>{event?.fromEmail}</span>
							</div>
						</div>

						{event?.googleDriveConnected && (
							<div className="flex items-center gap-2 text-sm">
								<Badge
									variant="outline"
									className="text-success border-success/30"
								>
									<LinkIcon className="h-3 w-3 mr-1" />
									Google Drive Connected
								</Badge>
								<span className="text-muted-foreground">
									→ {event?.rootFolder}
								</span>
							</div>
						)}
					</div>

					{/* <div className="flex gap-3">
							<Button variant="outline" asChild>
								<a href="#" target="_blank" rel="noopener noreferrer">
									<ExternalLink className="h-4 w-4" />
									Preview
								</a>
							</Button>
							<Button variant="teal" asChild>
								<a href={`/event/${id}/settings`}>
									<Settings className="h-4 w-4" />
									Settings
								</a>
							</Button>
						</div> */}
				</div>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
				<StatsCard
					title="Speakers"
					value={event?.speakerCount ?? 0}
					subtitle={`${modules?.speaker?.submitted ?? 0} forms submitted`}
					icon={<Mic2 className="h-6 w-6" />}
					variant="primary"
				/>
				<StatsCard
					title="Sessions"
					value={modules?.schedule?.sessions ?? 0}
					subtitle="In your schedule"
					icon={<Calendar className="h-6 w-6" />}
					variant="accent"
				/>
				{/* <StatsCard
						title="Attendees"
						value={event?.attendeeCount ?? 0}
						icon={<Users className="h-6 w-6" />}
					/> */}
				{/* <StatsCard
						title="Content Files"
						value={42}
						subtitle="12 pending review"
						icon={<FileText className="h-6 w-6" />}
					/> */}
			</div>

			{/* Modules */}
			<div>
				<h2 className="font-display text-2xl font-semibold text-foreground mb-6">
					Event Modules
				</h2>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					<ModuleCard
						title="Speaker Management"
						description="Manage speaker intake forms, assets, and promo cards"
						icon={<Mic2 className="h-6 w-6" />}
						href={`/organizer/event/${id}/speakers`}
						enabled={modules?.speaker?.enabled ?? false}
						stats={{
							label: "Registered Speakers",
							value: event?.speakerCount ?? 0,
						}}
						color="speaker"
						index={0}
					/>
					<ModuleCard
						title="Schedule Management"
						description="Create and publish your event schedule from Google Sheets"
						icon={<Calendar className="h-6 w-6" />}
						href={`/organizer/event/${id}/schedule`}
						enabled={modules?.schedule?.enabled ?? false}
						stats={{
							label: "Sessions",
							value: modules?.schedule?.sessions ?? 0,
						}}
						color="schedule"
						index={1}
					/>
					{/* <ModuleCard
							title="Content Management"
							description="Centralized hub for presentations, videos, and files"
							icon={<FileText className="h-6 w-6" />}
							href={`/event/${id}/content`}
							enabled={modules?.content?.enabled ?? false}
							color="content"
							comingSoon
							index={2}
						/>
						<ModuleCard
							title="Attendee Management"
							description="Manage attendee registrations and communications"
							icon={<Users className="h-6 w-6" />}
							href={`/event/${id}/attendees`}
							enabled={modules?.attendee?.enabled ?? false}
							color="attendee"
							comingSoon
							index={3}
						/> */}
				</div>
			</div>

		</div>
	);
}