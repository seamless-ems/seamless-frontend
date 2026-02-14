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
	ChevronLeft,
	Calendar,
	MapPin,
	Mail,
	Link as LinkIcon,
	Mic2,
	FileText,
	Users,
	FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createEvent, getIntegrationUrl, getGoogleDriveStatus, deleteIntegration, getTeam, uploadFile, getMe, createGoogleDriveFolder } from "@/lib/api";
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
import GoogleDriveFolderPicker from "@/components/organizer/GoogleDriveFolderPicker";
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
		googleDriveConnected: false,
		rootFolder: "",
		integrationId: null,
	});

	const [selectedModules, setSelectedModules] = useState<string[]>(["speaker"]);
	const [driveFolders, setDriveFolders] = useState<any[]>([]);
	// array of selected folder ids at each depth level, e.g. [topId, childId, grandChildId]
	const [selectedFolderPath, setSelectedFolderPath] = useState<string[]>([]);
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

	useEffect(() => {
		(async () => {
			try {
				const status = await getGoogleDriveStatus();
				if (status?.connected) {
					// keep nested folders structure and render nested options
					const folders = (status as any).folders ?? [];
					setDriveFolders(folders);
					setFormData((prev) => ({
						...prev,
						googleDriveConnected: true,
						rootFolder: (status as any).root_folder ?? (folders.length ? folders[0].id : prev.rootFolder ?? ""),
						integrationId:
							(status as any).integration?.id ?? (status as any).integration_id ?? (status as any).id ?? (status as any).integrationId ?? prev.integrationId ?? "",
					}));
				}
			} catch (err) {
				// silently ignore; not critical
			}
		})();
	}, []);

	// Google Drive folder picker moved to separate component

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

			// If files were selected, upload them first to obtain URLs and include them in the create payload
			// convert selectedModules array -> modules object (new API shape)
			const modulesObj: Record<string, boolean> = {};
			selectedModules.forEach((m) => (modulesObj[m] = true));

			const payload: any = { ...formData, modules: modulesObj, team_id: selectedTeamId, id: eventId };

			// If Drive is connected, include the integration id so backend can link resources
			if (formData.googleDriveConnected && formData.integrationId) {
				payload.integrationId = formData.integrationId;
			}

			try {
				if (eventImageFile) {
					// upload under current user so the upload can exist before event creation
					// pass the generated eventId so backend can associate the image with the event pre-creation
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

			// navigate to the event dashboard if id present
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
		<div className="space-y-8">
			<div className="max-w-4xl mx-auto space-y-6">
				<div>
					<h1 style={{ fontSize: 'var(--font-h1)', fontWeight: 600 }}>
						Create New Event
					</h1>
					<p className="text-muted-foreground mt-2" style={{ fontSize: 'var(--font-body)' }}>
						Set up your event details and choose which modules to enable
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Google Drive */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								<FolderOpen className="h-5 w-5 text-primary" />
								Google Drive Integration
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium text-foreground">
										Connect Google Drive
									</p>
									<p className="text-sm text-muted-foreground">
										Sync speaker assets and content automatically
									</p>
								</div>
								{formData.googleDriveConnected ? (
									<div className="flex items-center gap-2">
										<Button variant="outline" type="button" disabled>
											<svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
											Connected
										</Button>
										<Button
											variant="destructive"
											type="button"
											onClick={async () => {
												try {
													await deleteIntegration("google");
													// clear local state
													setDriveFolders([]);
													setFormData((prev) => ({ ...prev, googleDriveConnected: false, rootFolder: "" }));
													toast({ title: "Disconnected", description: "Google Drive integration removed" });
												} catch (err: any) {
													
													toast({ title: "Failed to disconnect", description: String(err?.message || err) });
												}
											}}
										>
											Disconnect
										</Button>
									</div>
								) : (
									<Button
										variant="outline"
										type="button"
										onClick={async () => {
											try {
												const res = await getIntegrationUrl("google");
												if (res?.url) {
													// navigate browser to provider authorization URL
													window.location.href = res.url;
												} else {
													toast({ title: "Failed to start integration", description: "No URL returned from server" });
												}
											} catch (err: any) {
												
												toast({ title: "Failed to start integration", description: String(err?.message || err) });
											}
										}}
									>
										<LinkIcon className="h-4 w-4" />
										Connect Drive
									</Button>
								)}
							</div>

							{formData.googleDriveConnected && (
								<div className="space-y-2">
									<GoogleDriveFolderPicker
										driveFolders={driveFolders}
										setDriveFolders={setDriveFolders}
										selectedFolderPath={selectedFolderPath}
										setSelectedFolderPath={setSelectedFolderPath}
										formData={formData}
										setFormData={setFormData}
									/>
									{/* Folder selection handled by GoogleDriveFolderPicker */}
								</div>
							)}
						</CardContent>
					</Card>
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
					{/* Basic Info */}
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

								<Label htmlFor="title">Event Title</Label>
								<Input
									id="title"
									placeholder="e.g., Tech Summit 2025"
									value={formData.title}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, title: e.target.value }))
									}
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
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												startDate: e.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="endDate">End Date</Label>
									<Input
										id="endDate"
										type="date"
										value={formData.endDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												endDate: e.target.value,
											}))
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="location">
									<MapPin className="h-4 w-4 inline mr-1" />
									Location
								</Label>
								<Input
									id="location"
									placeholder="e.g., San Francisco, CA"
									value={formData.location}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											location: e.target.value,
										}))
									}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="eventWebsite">
									<LinkIcon className="h-4 w-4 inline mr-1" />
									Event Website
								</Label>
								<Input
									id="eventWebsite"
									type="text"
									placeholder="https://example.com/event (optional)"
									value={formData.eventWebsite}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											eventWebsite: e.target.value,
										}))
									}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Email Settings */}
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
								<Input
									id="fromName"
									placeholder="e.g., Your Company Events"
									value={formData.fromName}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											fromName: e.target.value,
										}))
									}
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="fromEmail">'From' Email</Label>
									<Input
										id="fromEmail"
										type="email"
										placeholder="events@yourcompany.com"
										value={formData.fromEmail}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												fromEmail: e.target.value,
											}))
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="replyToEmail">'Reply To' Email</Label>
									<Input
										id="replyToEmail"
										type="email"
										placeholder="hello@yourcompany.com"
										value={formData.replyToEmail}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												replyToEmail: e.target.value,
											}))
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="signature">Email Signature</Label>
								<Textarea
									id="signature"
									placeholder="Your default email signature..."
									value={formData.emailSignature}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											emailSignature: e.target.value,
										}))
									}
									rows={3}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Modules */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Select Modules</CardTitle>
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
														Soon
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

					{/* Images & Templates (extracted) */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Images & Templates</CardTitle>
						</CardHeader>
						<CardContent>
									{/* EventMediaUploader handles image inputs and previews */}
									<EventMediaUploader
										eventImageFile={eventImageFile}
										setEventImageFile={setEventImageFile}
										eventImagePreview={eventImagePreview}
										setEventImagePreview={setEventImagePreview}
									/>
						</CardContent>
					</Card>
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
		</div>
	);
}
