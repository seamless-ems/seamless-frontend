import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import AddSpeakerDialog from "@/components/organizer/AddSpeakerDialog";

type Props = {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  totalCount: number;
  pendingCount: number;
};

export default function SpeakersControls({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  totalCount,
  pendingCount,
}: Props) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex gap-3">
        <Input
          placeholder="Search speakers…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[280px] h-9 text-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Info Pending</SelectItem>
            <SelectItem value="submitted">Info Submitted</SelectItem>
            <SelectItem value="approved">Cards Approved</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground flex items-center gap-4">
        <div>
          {totalCount} speaker{totalCount !== 1 ? 's' : ''}
          {pendingCount > 0 && (
            <span className="ml-3 inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning rounded text-xs font-medium">
              ⚠ {pendingCount} pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
