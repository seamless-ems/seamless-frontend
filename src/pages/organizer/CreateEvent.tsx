import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
	Calendar,
	MapPin,
	Mail,
	Link as LinkIcon,
	Mic2,
	FileText,
	Users,
	// FolderOpen, // TODO: Google Drive
} from "lucide-react";
import { cn } from "@/lib/utils";
// TODO: Google Drive — restore getIntegrationUrl, getGoogleDriveStatus, deleteIntegration, createGoogleDriveFolder when re-enabling
import { createEvent, getTeam, uploadFile, getMe } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
// import GoogleDriveFolderPicker from "@/components/organizer/GoogleDriveFolderPicker"; // TODO: Google Drive
import EventMediaUploader from "@/components/organizer/EventMediaUploader";
import { generateUuid } from "@/lib/utils";

const availableModules = [
	{
		id: "speaker",
		name: "Speakers",
		description: "Manage speakers, intake forms, and promo cards",
		icon: Mic2,
		color: "speaker",
		available: true,
	},
	{
		id: "schedule",
		name: "Schedule",
		description: "Create and publish event schedules",
		icon: Calendar,
		color: "schedule",
		available: false,
		comingSoon: true,
	},
	{
		id: "content",
		name: "Content",
		description: "Centralized hub for presentations and files",
		icon: FileText,
		color: "content",
		available: false,
		comingSoon: true,
	},
	{
		id: "partners",
		name: "Partners",
		description: "Manage sponsors and partners",
		icon: Users,
		color: "primary",
		available: false,
		comingSoon: true,
	},
	{
		id: "attendee",
		name: "Attendees",
		description: "Manage registrations and communications",
		icon: Users,
		color: "attendee",
		available: false,
		comingSoon: true,
	},
];

export default function CreateEvent() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		title: "",
		startDate: "",
		endDate: "",
		location: "",
		eventWebsite: "",
		fromName: "",
		fromEmail: "",
		replyToEmail: "",
		emailSignature: "",
		// googleDriveConnected: false, // TODO: Google Drive
		// rootFolder: "",              // TODO: Google Drive
		// integrationId: null,         // TODO: Google Drive
	});

	const [selectedModules, setSelectedModules] = useState<string[]>(["speaker"]);
	// const [driveFolders, setDriveFolders] = useState<any[]>([]);           // TODO: Google Drive
	// const [selectedFolderPath, setSelectedFolderPath] = useState<string[]>([]); // TODO: Google Drive
	const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam() });
	const [noTeamsModalOpen, setNoTeamsModalOpen] = React.useState(false);
	const noTeamsModalShown = React.useRef(false);
	const location = useLocation();

	// pick team from query param ?team=<id> or default to first available
	const urlParams = new URLSearchParams(location.search);
	const defaultTeamFromQuery = urlParams.get("team") ?? undefined;

	const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(
		defaultTeamFromQuery ?? teams?.[0]?.id
	);

	const [eventImageFile, setEventImageFile] = useState<File | null>(null);
	const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
	const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });
	const [isSubmitting, setIsSubmitting] = useState(false);

	// when teams load, ensure selectedTeamId is set
	useEffect(() => {
		if (!selectedTeamId && teams && teams.length) {
			setSelectedTeamId(defaultTeamFromQuery ?? teams[0].id);
		}

		// If teams loaded and empty, show a modal directing user to profile/settings
		if (Array.isArray(teams) && teams.length === 0 && !noTeamsModalShown.current) {
			noTeamsModalShown.current = true;
			setNoTeamsModalOpen(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teams]);

	// cleanup object URLs when previews change or component unmounts
	React.useEffect(() => {
		return () => {
			if (eventImagePreview) URL.revokeObjectURL(eventImagePreview);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// TODO: Google Drive — restore this effect when re-enabling Drive integration
	// useEffect(() => {
	// 	(async () => {
	// 		try {
	// 			const status = await getGoogleDriveStatus();
	// 			if (status?.connected) {
	// 				const folders = (status as any).folders ?? [];
	// 				setDriveFolders(folders);
	// 				setFormData((prev) => ({
	// 					...prev,
	// 					googleDriveConnected: true,
	// 					rootFolder: (status as any).root_folder ?? (folders.length ? folders[0].id : prev.rootFolder ?? ""),
	// 					integrationId: (status as any).integration?.id ?? (status as any).integration_id ?? (status as any).id ?? (status as any).integrationId ?? prev.integrationId ?? "",
	// 				}));
	// 			}
	// 		} catch (err) {
	// 			// silently ignore; not critical
	// 		}
	// 	})();
	// }, []);

	const toggleModule = (moduleId: string) => {
		setSelectedModules((prev) =>
			prev.includes(moduleId)
				? prev.filter((id) => id !== moduleId)
				: [...prev, moduleId]
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			if (!selectedTeamId) {
				toast({ title: "No team selected", description: "Please choose a team before creating an event" });
				return;
			}

			const eventId = generateUuid();

			const modulesObj: Record<string, boolean> = {};
			selectedModules.forEach((m) => (modulesObj[m] = true));

			const payload: any = { ...formData, modules: modulesObj, team_id: selectedTeamId, id: eventId };

			// TODO: Google Drive — re-enable when Drive integration is active
			// if (formData.googleDriveConnected && formData.integrationId) {
			// 	payload.integrationId = formData.integrationId;
			// }

			try {
				if (eventImageFile) {
					const res = await uploadFile(eventImageFile, undefined, eventId);
					const imageValue = res?.public_url ?? res?.publicUrl ?? res?.url ?? res?.id ?? null;
					if (imageValue) payload.eventImage = imageValue;
				}
			} catch (err: any) {
				toast({ title: "Event image upload failed", description: String(err?.message || err) });
				// continue — backend may accept create without image, or user can retry
			}

			const created = await createEvent(payload);
			toast({ title: "Event created", description: `Created ${created.title ?? created.id ?? "event"}` });

			if (created?.id) {
				navigate(`/organizer/event/${created.id}`);
			} else {
				navigate("/organizer/events");
			}
		} catch (err: any) {
			toast({ title: "Failed to create event", description: String(err?.message || err) });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* No-teams danger modal */}
			<AlertDialog open={noTeamsModalOpen} onOpenChange={setNoTeamsModalOpen}>
				<AlertDialogContent>
					<AlertDialogTitle className="text-destructive">Organization & Team Required</AlertDialogTitle>
					<AlertDialogDescription className="text-destructive">
						The application requires you to belong to an <strong>organization</strong> and at least one <strong>team</strong> to create and manage events. Without these, key features (events, speakers, assets) will not work correctly.
						<div className="mt-2 text-sm text-muted-foreground">
							Please create or join an organization and team from your profile before continuing.
						</div>
					</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setNoTeamsModalOpen(false)}>Dismiss</AlertDialogCancel>
						<AlertDialogAction asChild>
							<Button
								variant="destructive"
								onClick={() => {
									setNoTeamsModalOpen(false);
									navigate("/organizer/settings");
								}}
							>
								Open profile
							</Button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* TODO: Google Drive — card commented out, not MVP. See git history to restore. */}

				{/* Event Details */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<Calendar className="h-5 w-5 text-primary" />
							Event Details
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="team">Team</Label>
							<Select value={selectedTeamId ?? ""} onValueChange={(val) => setSelectedTeamId(val)}>
								<SelectTrigger className="w-full sm:w-[300px]">
									<SelectValue placeholder={teams && teams.length ? "Select team" : "No teams"} />
								</SelectTrigger>
								<SelectContent>
									{teams && teams.length ? (
										teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
									) : (
										<SelectItem value="no-teams" disabled>No teams available</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="title">Event Title</Label>
							<Input
								id="title"
								placeholder="e.g., Tech Summit 2025"
								value={formData.title}
								onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
								required
							/>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="startDate">Start Date</Label>
								<Input
									id="startDate"
									type="date"
									value={formData.startDate}
									onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="endDate">End Date</Label>
								<Input
									id="endDate"
									type="date"
									value={formData.endDate}
									onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="location">Location</Label>
							<Input
								id="location"
								placeholder="e.g., San Francisco, CA"
								value={formData.location}
								onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="eventWebsite">Event Website</Label>
							<Input
								id="eventWebsite"
								type="url"
								placeholder="https://example.com/event"
								value={formData.eventWebsite}
								onChange={(e) => setFormData((prev) => ({ ...prev, eventWebsite: e.target.value }))}
								required
							/>
						</div>
					</CardContent>
				</Card>

				{/* TODO: Email Settings — moved to per-module config. See git history to restore.
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<Mail className="h-5 w-5 text-primary" />
							Email Settings
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="fromName">'From' Name</Label>
							<Input id="fromName" placeholder="e.g., Your Company Events" value={formData.fromName}
								onChange={(e) => setFormData((prev) => ({ ...prev, fromName: e.target.value }))} />
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="fromEmail">'From' Email</Label>
								<Input id="fromEmail" type="email" placeholder="events@yourcompany.com" value={formData.fromEmail}
									onChange={(e) => setFormData((prev) => ({ ...prev, fromEmail: e.target.value }))} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="replyToEmail">'Reply To' Email</Label>
								<Input id="replyToEmail" type="email" placeholder="hello@yourcompany.com" value={formData.replyToEmail}
									onChange={(e) => setFormData((prev) => ({ ...prev, replyToEmail: e.target.value }))} />
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="signature">Email Signature</Label>
							<Textarea id="signature" placeholder="Your default email signature..." value={formData.emailSignature}
								onChange={(e) => setFormData((prev) => ({ ...prev, emailSignature: e.target.value }))} rows={3} />
						</div>
					</CardContent>
				</Card>
				*/}

				{/* Modules */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Active Modules</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{availableModules.map((module) => {
								const Icon = module.icon;
								const isSelected = selectedModules.includes(module.id);

								return (
									<div
										key={module.id}
										className={cn(
											"rounded-lg border p-3 transition-all duration-200 cursor-pointer",
											isSelected
												? "border-primary bg-primary/5"
												: "border-border hover:border-primary/30",
											!module.available && "opacity-50 cursor-not-allowed"
										)}
										onClick={() =>
											module.available && toggleModule(module.id)
										}
									>
										<div className="flex items-center justify-between mb-2">
											<div
												className={cn(
													"flex h-8 w-8 items-center justify-center rounded",
													isSelected
														? "bg-primary text-primary-foreground"
														: "bg-muted text-muted-foreground"
												)}
											>
												<Icon className="h-4 w-4" />
											</div>
											{module.comingSoon ? (
												<Badge variant="secondary" className="text-xs">
													Coming Soon
												</Badge>
											) : (
												<Switch
													checked={isSelected}
													disabled={!module.available}
												/>
											)}
										</div>
										<h4 className="font-medium text-foreground text-sm mb-1">
											{module.name}
										</h4>
										<p className="text-xs text-muted-foreground">
											{module.description}
										</p>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>

				{/* TODO: Event Images — not needed for MVP. See git history to restore.
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Images</CardTitle>
					</CardHeader>
					<CardContent>
						<EventMediaUploader eventImageFile={eventImageFile} setEventImageFile={setEventImageFile}
							eventImagePreview={eventImagePreview} setEventImagePreview={setEventImagePreview} />
					</CardContent>
				</Card>
				*/}

				<div className="flex justify-end gap-4">
					<Button variant="outline" type="button" className="border-[1.5px]" asChild>
						<Link to="/organizer/events">Cancel</Link>
					</Button>
					<Button variant="outline" type="submit" className="border-[1.5px]" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<svg className="h-4 w-4 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
								</svg>
								Creating…
							</>
						) : (
							"Create Event"
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
