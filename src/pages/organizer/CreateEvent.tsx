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
import { createEvent, getIntegrationUrl, getGoogleDriveStatus, deleteIntegration, getTeam, uploadFile, getMe } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";

const availableModules = [
	{
		id: "speaker",
		name: "Speaker Management",
		description: "Manage speakers, intake forms, and promo cards",
		icon: Mic2,
		color: "speaker",
		available: true,
	},
	{
		id: "schedule",
		name: "Schedule Management",
		description: "Create and publish event schedules",
		icon: Calendar,
		color: "schedule",
		available: true,
	},
	{
		id: "content",
		name: "Content Management",
		description: "Centralized hub for presentations and files",
		icon: FileText,
		color: "content",
		available: false,
		comingSoon: true,
	},
	{
		id: "attendee",
		name: "Attendee Management",
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
		fromEmail: "",
		replyToEmail: "",
		emailSignature: "",
		googleDriveConnected: false,
		rootFolder: "",
	});

	const [selectedModules, setSelectedModules] = useState<string[]>(["speaker"]);
			const [driveFolders, setDriveFolders] = useState<any[]>([]);
			// array of selected folder ids at each depth level, e.g. [topId, childId, grandChildId]
			const [selectedFolderPath, setSelectedFolderPath] = useState<string[]>([]);
	const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam() });
	const location = useLocation();

	// pick team from query param ?team=<id> or default to first available
	const urlParams = new URLSearchParams(location.search);
	const defaultTeamFromQuery = urlParams.get("team") ?? undefined;

	const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(
		defaultTeamFromQuery ?? teams?.[0]?.id
	);

	const [eventImageFile, setEventImageFile] = useState<File | null>(null);
	const [promoTemplateFile, setPromoTemplateFile] = useState<File | null>(null);
	const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
	const [promoTemplatePreview, setPromoTemplatePreview] = useState<string | null>(null);
	const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });
	const [isSubmitting, setIsSubmitting] = useState(false);

	// when teams load, ensure selectedTeamId is set
	useEffect(() => {
		if (!selectedTeamId && teams && teams.length) {
			setSelectedTeamId(defaultTeamFromQuery ?? teams[0].id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teams]);

	// cleanup object URLs when previews change or component unmounts
	React.useEffect(() => {
		return () => {
			if (eventImagePreview) URL.revokeObjectURL(eventImagePreview);
			if (promoTemplatePreview) URL.revokeObjectURL(promoTemplatePreview);
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
					}));
				}
			} catch (err) {
				// silently ignore; not critical
				console.debug("Google Drive status check failed", err);
			}
		})();
	}, []);

		// Find path of ids from root to targetId if present
		const findPathToFolder = (folders: any[], targetId: string): string[] => {
			if (!folders || !targetId) return [];
			for (const f of folders) {
				if (f.id === targetId) return [f.id];
				if (f.children && f.children.length) {
					const childPath = findPathToFolder(f.children, targetId);
					if (childPath.length) return [f.id, ...childPath];
				}
			}
			return [];
		};

		// helper to find folder object by id
		const findFolderById = (folders: any[], id?: string): any | null => {
			if (!id) return null;
			for (const f of folders) {
				if (f.id === id) return f;
				if (f.children && f.children.length) {
					const res = findFolderById(f.children, id);
					if (res) return res;
				}
			}
			return null;
		};

		const getBreadcrumb = () => {
			if (!selectedFolderPath || !selectedFolderPath.length) return "";
			const names = selectedFolderPath.map((id) => findFolderById(driveFolders, id)?.name ?? id);
			return names.join(" / ");
		};

		// Get folder list for a particular depth level based on current selectedFolderPath
		const getFoldersForDepth = (depth: number): any[] => {
			if (depth === 0) return driveFolders;
			let current = null as any;
			for (let i = 0; i < depth; i++) {
				const id = selectedFolderPath[i];
				if (!id) return [];
				const list = current ? current.children ?? [] : driveFolders;
				current = list.find((x: any) => x.id === id);
				if (!current) return [];
			}
			return current?.children ?? [];
		};

		// Build cascading Select components for each depth until no further children

		const [currentDepth, setCurrentDepth] = useState<number>(0);

		const handleSelectAtDepth = (depth: number, val: string) => {
			setSelectedFolderPath((prev) => {
				const next = prev.slice(0, depth);
				next[depth] = val;
				return next;
			});
			setFormData((f) => ({ ...f, rootFolder: val }));
			// if selected folder has children, advance depth; otherwise trim
			const opts = getFoldersForDepth(depth);
			const selected = opts.find((o: any) => o.id === val);
			if (selected && selected.children && selected.children.length) setCurrentDepth(depth + 1);
			else setCurrentDepth(depth);
		};

		const renderCascadingSelects = () => {
			const options = getFoldersForDepth(currentDepth);
			if (!options || options.length === 0) return (
				<Select>
					<SelectTrigger className="w-full sm:w-[300px]">
						<SelectValue placeholder="No folders available" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="no-folders" disabled>No folders available</SelectItem>
					</SelectContent>
				</Select>
			);

			const value = selectedFolderPath[currentDepth] ?? "";
			return (
				<div>
					<div className="text-xs text-muted-foreground mb-1">{currentDepth === 0 ? "Top level" : `Level ${currentDepth + 1}`}</div>
					<Select value={value} aria-label={`Folder level ${currentDepth + 1}`} onValueChange={(val) => handleSelectAtDepth(currentDepth, val)}>
						<SelectTrigger className="w-full sm:w-[300px]">
							<SelectValue placeholder={currentDepth === 0 ? "Select folder" : "Select subfolder"} />
						</SelectTrigger>
						<SelectContent>
							{options.map((f: any) => (
								<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			);
		};

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

			// Generate a deterministic event id for uploads so backend can associate assets with the event
			const generateUuid = () => {
				try {
					// prefer crypto.randomUUID when available
					if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
						return (crypto as any).randomUUID();
					}
				} catch (err) {
					// fallthrough to fallback generator
				}

				// fallback RFC4122 v4-ish generator
				return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
					const r = (Math.random() * 16) | 0;
					const v = c === 'x' ? r : (r & 0x3) | 0x8;
					return v.toString(16);
				});
			};

			const eventId = generateUuid();

			// If files were selected, upload them first to obtain URLs and include them in the create payload
			// convert selectedModules array -> modules object (new API shape)
			const modulesObj: Record<string, boolean> = {};
			selectedModules.forEach((m) => (modulesObj[m] = true));

			const payload: any = { ...formData, modules: modulesObj, team_id: selectedTeamId, id: eventId };

			try {
				if (eventImageFile) {
					// upload under current user so the upload can exist before event creation
					// pass the generated eventId so backend can associate the image with the event pre-creation
					const res = await uploadFile(eventImageFile, "user", me?.id ?? "", undefined, eventId);
					const imageValue = res?.public_url ?? res?.publicUrl ?? res?.url ?? res?.id ?? null;
					if (imageValue) payload.eventImage = imageValue;
				}
			} catch (err: any) {
				console.error("Event image upload failed", err);
				toast({ title: "Event image upload failed", description: String(err?.message || err) });
				// continue — backend may accept create without image, or user can retry
			}

			try {
				if (promoTemplateFile) {
					// pass eventId to associate the promo template with the event
					const res2 = await uploadFile(promoTemplateFile, "user", me?.id ?? "", undefined, eventId);
					const promoValue = res2?.public_url ?? res2?.publicUrl ?? res2?.url ?? res2?.id ?? null;
					if (promoValue) payload.promoCardTemplate = promoValue;
				}
			} catch (err: any) {
				console.error("Promo template upload failed", err);
				toast({ title: "Promo template upload failed", description: String(err?.message || err) });
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
			console.error("Create event failed", err);
			toast({ title: "Failed to create event", description: String(err?.message || err) });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-8">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to="/organizer/events">
							<ChevronLeft className="h-4 w-4" />
							Back to Events
						</Link>
					</Button>
				</div>

				<div>
					<h1 className="font-display text-3xl font-bold text-foreground">
						Create New Event
					</h1>
					<p className="text-muted-foreground mt-1">
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
													console.error("Failed to disconnect", err);
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
												console.error("Integration link failed", err);
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
									<Label htmlFor="rootFolder">Root Event Folder</Label>
									{renderCascadingSelects()}
									<div className="flex items-center gap-3 mt-2">
										<div className="text-sm text-muted-foreground">{getBreadcrumb() || "No folder selected"}</div>
										{selectedFolderPath && selectedFolderPath.length > 0 && (
											<Button variant="ghost" size="sm" type="button" onClick={() => { setSelectedFolderPath([]); setFormData((f) => ({ ...f, rootFolder: "" })); setCurrentDepth(0); }}>
											Clear selection
											</Button>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
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
							<div className="grid gap-4 sm:grid-cols-2">
								{availableModules.map((module) => {
									const Icon = module.icon;
									const isSelected = selectedModules.includes(module.id);

									return (
										<div
											key={module.id}
											className={cn(
												"rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
												isSelected
													? "border-primary bg-primary/5"
													: "border-border hover:border-primary/30",
												!module.available && "opacity-50 cursor-not-allowed"
											)}
											onClick={() =>
												module.available && toggleModule(module.id)
											}
										>
											<div className="flex items-start justify-between mb-3">
												<div
													className={cn(
														"flex h-10 w-10 items-center justify-center rounded-lg",
														isSelected
															? "bg-primary text-primary-foreground"
															: "bg-muted text-muted-foreground"
													)}
												>
													<Icon className="h-5 w-5" />
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
											<h4 className="font-semibold text-foreground mb-1">
												{module.name}
											</h4>
											<p className="text-sm text-muted-foreground">
												{module.description}
											</p>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>

					{/* Submit */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Images & Templates</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2 items-start">
								<div className="space-y-2">
									<Label htmlFor="eventImage">Event Image</Label>
									<input
										id="eventImage"
										type="file"
										accept="image/*"
										onChange={(e) => {
											const f = e.target.files?.[0] ?? null;
											setEventImageFile(f);
											if (f) setEventImagePreview(URL.createObjectURL(f));
											else setEventImagePreview(null);
										}}
									/>
									{eventImagePreview && (
										<img src={eventImagePreview} alt="Event" className="mt-2 max-h-40 rounded" />
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="promoTemplate">Promo Card Template (PNG/PDF)</Label>
									<input
										id="promoTemplate"
										type="file"
										accept="image/*,application/pdf"
										onChange={(e) => {
											const f = e.target.files?.[0] ?? null;
											setPromoTemplateFile(f);
											if (f && f.type.startsWith("image/")) setPromoTemplatePreview(URL.createObjectURL(f));
											else setPromoTemplatePreview(null);
										}}
									/>
									{promoTemplatePreview && (
										<img src={promoTemplatePreview} alt="Promo template" className="mt-2 max-h-40 rounded" />
									)}
								</div>
							</div>
						</CardContent>
					</Card>
					<div className="flex justify-end gap-4">
						<Button variant="outline" type="button" asChild>
							<Link to="/organizer/events">Cancel</Link>
						</Button>
						<Button variant="teal" type="submit" size="lg" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
