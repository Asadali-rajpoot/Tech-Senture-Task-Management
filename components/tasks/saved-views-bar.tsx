"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Bookmark,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  SlidersHorizontal,
  BookmarkCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getSavedViewsAction,
  createSavedViewAction,
  deleteSavedViewAction,
} from "@/app/(app)/tasks/saved-views/actions";
import { type SavedViewItem } from "@/lib/data/saved-views";

export interface TaskFilterState {
  search?: string;
  status?: string;
  priority?: string;
  teamId?: string;
  assigneeId?: string;
}

interface SavedViewsBarProps {
  currentFilters: TaskFilterState;
  onApplyView: (filters: TaskFilterState) => void;
  initialSavedViews?: SavedViewItem[];
}

const EMPTY_SAVED_VIEWS: SavedViewItem[] = [];

export function SavedViewsBar({
  currentFilters,
  onApplyView,
  initialSavedViews = EMPTY_SAVED_VIEWS,
}: SavedViewsBarProps) {
  const [savedViews, setSavedViews] = useState<SavedViewItem[]>(initialSavedViews);
  const [isSaving, setIsSaving] = useState(false);
  const [viewName, setViewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Load saved views on mount
  useEffect(() => {
    let isMounted = true;
    startTransition(async () => {
      try {
        const res = await getSavedViewsAction();
        if (isMounted && res.savedViews) {
          setSavedViews(res.savedViews);
        }
      } catch (err) {
        console.error("Failed to fetch saved views", err);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveCurrentView = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewName.trim()) return;

    startTransition(async () => {
      const res = await createSavedViewAction(viewName.trim(), currentFilters);
      if (res.savedView) {
        setSavedViews((prev) => [res.savedView!, ...prev]);
        setActiveViewId(res.savedView.id);
        setViewName("");
        setIsSaving(false);
      }
    });
  };

  const handleDeleteView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const res = await deleteSavedViewAction(id);
      if (res.success) {
        setSavedViews((prev) => prev.filter((v) => v.id !== id));
        if (activeViewId === id) {
          setActiveViewId(null);
        }
      }
    });
  };

  const handleSelectView = (view: SavedViewItem) => {
    try {
      const parsedFilters = JSON.parse(view.filters) as TaskFilterState;
      setActiveViewId(view.id);
      onApplyView(parsedFilters);
    } catch (err) {
      console.error("Failed to parse saved view filters", err);
    }
  };

  return (
    <div className="border-border/60 bg-background/50 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="text-muted flex items-center gap-1 font-semibold">
          <Bookmark className="size-3.5" />
          <span>Views:</span>
        </div>

        {savedViews.length === 0 && !isSaving && (
          <span className="text-muted text-[11px] italic">
            No saved filter views yet
          </span>
        )}

        {savedViews.map((view) => {
          const isActive = activeViewId === view.id;
          return (
            <div
              key={view.id}
              onClick={() => handleSelectView(view)}
              className={`group flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-white shadow-2xs"
                  : "border-border bg-card text-text hover:border-primary/50 hover:bg-background border"
              }`}
            >
              {isActive ? (
                <BookmarkCheck className="size-3 text-white" />
              ) : (
                <Bookmark className="text-muted group-hover:text-primary size-3" />
              )}
              <span>{view.name}</span>
              <button
                type="button"
                onClick={(e) => handleDeleteView(view.id, e)}
                className={`ml-0.5 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 ${
                  isActive ? "text-white hover:bg-white/20" : "text-muted hover:text-danger hover:bg-danger/10"
                }`}
                title="Delete saved view"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {isSaving ? (
          <form onSubmit={handleSaveCurrentView} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="View name (e.g. High Priority)"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              className="border-border bg-card text-text placeholder:text-muted focus:border-primary h-7 rounded border px-2 py-0.5 text-xs focus:outline-none"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !viewName.trim()}
              className="bg-primary hover:bg-primary/90 h-7 px-2 text-xs font-semibold text-white"
            >
              {isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSaving(false);
                setViewName("");
              }}
              className="text-muted hover:text-text h-7 px-2 text-xs"
            >
              <X className="size-3" />
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsSaving(true)}
            className="border-border hover:bg-card h-7 gap-1 px-2 text-xs font-medium text-muted hover:text-text"
          >
            <Plus className="size-3" />
            <span>Save current view</span>
          </Button>
        )}
      </div>
    </div>
  );
}
