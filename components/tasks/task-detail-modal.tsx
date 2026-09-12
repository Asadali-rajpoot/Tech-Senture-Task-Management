"use client";

import React, { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  toggleSubtaskAction,
  createSubtaskAction,
  deleteSubtaskAction,
  createLabelAction,
  deleteLabelAction,
  toggleTaskLabelAction,
  updateTaskStatusAction,
  updateTaskAssigneeAction,
  createCommentAction,
  updateCommentAction,
  deleteCommentAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
  addDependencyAction,
  removeDependencyAction,
  createTimeEntryAction,
  deleteTimeEntryAction,
  type TaskActionResponse,
} from "@/app/(app)/tasks/actions";
import {
  TaskPriority,
  TaskStatus,
  ProjectDomain,
  TeamRole,
  OrgRole,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  X,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Tag,
  Calendar,
  FolderKanban,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Edit,
  MessageSquare,
  Send,
  AtSign,
  User as UserIcon,
  Paperclip,
  Download,
  FileText,
  FileImage,
  FileArchive,
  File as FileIcon,
  Upload,
  Link2,
  Unlink,
  ArrowRight,
  Repeat,
  History,
} from "lucide-react";
import {
  TaskItem,
  TaskComment,
  TaskAttachment,
  TaskDependencyItem,
  TaskDependentItem,
  TaskTimeEntry,
  TaskActivityItem,
  TeamWithMembers,
} from "@/app/(app)/tasks/list/task-list-client";

interface TaskDetailModalProps {
  task: TaskItem;
  allTasks?: TaskItem[];
  teams: TeamWithMembers[];
  currentUser?: {
    id: string;
    orgRole: OrgRole;
  };
  onClose: () => void;
  onEdit: () => void;
}

const PRESET_COLORS = [
  "#6366F1", // Primary Indigo
  "#8B5CF6", // Secondary Purple
  "#22C55E", // Success Green
  "#F59E0B", // Warning Amber
  "#EF4444", // Danger Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <FileImage className="text-primary size-4 shrink-0" />;
  }
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  ) {
    return <FileText className="text-secondary size-4 shrink-0" />;
  }
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("compressed")
  ) {
    return <FileArchive className="text-warning size-4 shrink-0" />;
  }
  return <FileIcon className="text-muted size-4 shrink-0" />;
}

export function TaskDetailModal({
  task,
  allTasks = [],
  teams,
  currentUser,
  onClose,
  onEdit,
}: TaskDetailModalProps) {
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [labels, setLabels] = useState(task.labels || []);
  const [comments, setComments] = useState<TaskComment[]>(task.comments || []);
  const [attachments, setAttachments] = useState<TaskAttachment[]>(
    task.attachments || []
  );
  const [dependencies, setDependencies] = useState<TaskDependencyItem[]>(
    task.dependencies || []
  );
  const [dependents, setDependents] = useState<TaskDependentItem[]>(
    task.dependents || []
  );
  const [timeEntries, setTimeEntries] = useState<TaskTimeEntry[]>(
    task.timeEntries || []
  );
  const [activities, setActivities] = useState<TaskActivityItem[]>(
    task.activities || []
  );

  // Status & Warning state
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(task.status);
  const [softWarning, setSoftWarning] = useState<string | null>(null);

  // Time Tracking state (PRD §6.5.10)
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [logHours, setLogHours] = useState("");
  const [logMinutes, setLogMinutes] = useState("");
  const [logNote, setLogNote] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isSubmittingTime, setIsSubmittingTime] = useState(false);

  // Dependency state
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [selectedPrereqTaskId, setSelectedPrereqTaskId] = useState("");
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [isSubmittingDep, setIsSubmittingDep] = useState(false);

  // Subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Label state
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);

  // Comment state
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Attachment state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, startTransition] = useTransition();

  const currentTeam = teams.find((t) => t.id === task.team.id);
  const teamMembers = currentTeam?.memberships.map((m) => m.user) || [];
  const teamLabels = currentTeam?.labels || [];

  const completedCount = subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasks = subtasks.length;
  const completionPercentage =
    totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

  const now = new Date();
  const isOverdue =
    task.dueDate &&
    task.status !== TaskStatus.DONE &&
    new Date(task.dueDate) < now;

  // Priority badge styling
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "bg-danger/15 text-danger border-danger/30";
      case TaskPriority.MEDIUM:
        return "bg-warning/15 text-warning border-warning/30";
      case TaskPriority.LOW:
      default:
        return "bg-muted/15 text-muted border-border";
    }
  };

  // Subtask handlers
  const handleToggleSubtask = (subtaskId: string, currentStatus: boolean) => {
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtaskId ? { ...s, isCompleted: !currentStatus } : s
      )
    );
    startTransition(async () => {
      await toggleSubtaskAction(subtaskId, !currentStatus);
    });
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    setIsAddingSubtask(true);
    const tempId = `temp-${Date.now()}`;
    const newTitle = newSubtaskTitle.trim();
    setNewSubtaskTitle("");

    setSubtasks((prev) => [
      ...prev,
      { id: tempId, title: newTitle, isCompleted: false },
    ]);

    const formData = new FormData();
    formData.append("taskId", task.id);
    formData.append("title", newTitle);

    const res = await createSubtaskAction({}, formData);
    if (res.subtaskId) {
      setSubtasks((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, id: res.subtaskId! } : s))
      );
    }
    setIsAddingSubtask(false);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    startTransition(async () => {
      const formData = new FormData();
      formData.append("subtaskId", subtaskId);
      await deleteSubtaskAction({}, formData);
    });
  };

  // Label handlers
  const handleToggleLabel = (label: {
    id: string;
    name: string;
    color: string;
  }) => {
    const isAttached = labels.some((l) => l.id === label.id);
    if (isAttached) {
      setLabels((prev) => prev.filter((l) => l.id !== label.id));
      startTransition(async () => {
        await toggleTaskLabelAction(task.id, label.id, "detach");
      });
    } else {
      setLabels((prev) => [...prev, label]);
      startTransition(async () => {
        await toggleTaskLabelAction(task.id, label.id, "attach");
      });
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    const formData = new FormData();
    formData.append("teamId", task.team.id);
    formData.append("name", newLabelName.trim());
    formData.append("color", newLabelColor);

    const res = await createLabelAction({}, formData);
    if (res.labelId) {
      const newLabel = {
        id: res.labelId,
        name: newLabelName.trim(),
        color: newLabelColor,
      };
      setLabels((prev) => [...prev, newLabel]);
      startTransition(async () => {
        await toggleTaskLabelAction(task.id, res.labelId!, "attach");
      });
      setNewLabelName("");
      setIsCreatingLabel(false);
    }
  };

  // Status handler with Soft Warning enforcement (PRD.md §6.5.8)
  const handleStatusChange = (newStatus: TaskStatus) => {
    setCurrentStatus(newStatus);
    if (newStatus === TaskStatus.DONE) {
      const incompletePrereqs = dependencies.filter(
        (d) => d.dependsOnTask.status !== TaskStatus.DONE
      );
      if (incompletePrereqs.length > 0) {
        setSoftWarning(
          `Warning: ${incompletePrereqs.length} prerequisite task${incompletePrereqs.length > 1 ? "s are" : " is"} still incomplete (${incompletePrereqs.map((d) => `"${d.dependsOnTask.title}"`).join(", ")}). You can still mark this task as Done.`
        );
      } else {
        setSoftWarning(null);
      }
    } else {
      setSoftWarning(null);
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("taskId", task.id);
      fd.append("status", newStatus);
      const res = await updateTaskStatusAction({}, fd);
      if (res.warning) {
        setSoftWarning(res.warning);
      }
    });
  };

  // Time Tracking handlers (PRD §6.5.10)
  const totalLoggedMinutes = timeEntries.reduce(
    (acc, te) => acc + te.durationMinutes,
    0
  );
  const totalLoggedHoursFormatted = (totalLoggedMinutes / 60)
    .toFixed(1)
    .replace(/\.0$/, "");
  const estimateHours = task.estimatedHours;
  const progressPercent =
    estimateHours && estimateHours > 0
      ? Math.min(
          Math.round(((totalLoggedMinutes / 60) / estimateHours) * 100),
          100
        )
      : 0;
  const isOverEstimate =
    estimateHours &&
    estimateHours > 0 &&
    totalLoggedMinutes / 60 > estimateHours;

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setTimeError(null);

    const hours = parseFloat(logHours) || 0;
    const minutes = parseInt(logMinutes, 10) || 0;
    const duration = Math.round(hours * 60 + minutes);

    if (duration <= 0) {
      setTimeError("Please specify a valid duration (hours or minutes).");
      return;
    }

    setIsSubmittingTime(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry: TaskTimeEntry = {
      id: tempId,
      durationMinutes: duration,
      note: logNote.trim() || null,
      loggedAt: new Date().toISOString(),
      user: {
        id: currentUser?.id || "unknown",
        name: "You",
        email: null,
        image: null,
      },
    };

    setTimeEntries((prev) => [optimisticEntry, ...prev]);

    const formData = new FormData();
    formData.append("taskId", task.id);
    formData.append("durationMinutes", duration.toString());
    if (logNote.trim()) formData.append("note", logNote.trim());

    const res = await createTimeEntryAction({}, formData);
    if (res.error) {
      setTimeError(res.error);
      setTimeEntries((prev) => prev.filter((te) => te.id !== tempId));
    } else if (res.timeEntryId) {
      setTimeEntries((prev) =>
        prev.map((te) =>
          te.id === tempId ? { ...te, id: res.timeEntryId! } : te
        )
      );
      setLogHours("");
      setLogMinutes("");
      setLogNote("");
      setIsLoggingTime(false);
    }
    setIsSubmittingTime(false);
  };

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    setTimeEntries((prev) => prev.filter((te) => te.id !== timeEntryId));
    startTransition(async () => {
      const formData = new FormData();
      formData.append("timeEntryId", timeEntryId);
      await deleteTimeEntryAction({}, formData);
    });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const renderActivityDescription = (act: TaskActivityItem) => {
    switch (act.action) {
      case "STATUS_CHANGED":
        return (
          <span>
            changed status from{" "}
            <span className="font-semibold text-text">{act.oldValue || "None"}</span> to{" "}
            <span className="font-semibold text-primary">{act.newValue}</span>
          </span>
        );
      case "PRIORITY_CHANGED":
        return (
          <span>
            changed priority from{" "}
            <span className="font-semibold text-text">{act.oldValue}</span> to{" "}
            <span className="font-semibold text-primary">{act.newValue}</span>
          </span>
        );
      case "ASSIGNEE_CHANGED":
        return (
          <span>
            changed assignee from{" "}
            <span className="font-semibold text-text">{act.oldValue}</span> to{" "}
            <span className="font-semibold text-primary">{act.newValue}</span>
          </span>
        );
      case "TITLE_CHANGED":
        return (
          <span>
            changed title to <span className="font-semibold text-text">"{act.newValue}"</span>
          </span>
        );
      case "ESTIMATE_CHANGED":
        return (
          <span>
            updated estimate from{" "}
            <span className="font-semibold text-text">{act.oldValue}</span> to{" "}
            <span className="font-semibold text-primary">{act.newValue}</span>
          </span>
        );
      case "COMMENT_ADDED":
        return (
          <span>
            posted a comment:{" "}
            <span className="italic text-muted font-normal">"{act.newValue}"</span>
          </span>
        );
      case "ATTACHMENT_ADDED":
        return (
          <span>
            attached file <span className="font-semibold text-primary">"{act.newValue}"</span>
          </span>
        );
      case "DEPENDENCY_ADDED":
        return (
          <span>
            added prerequisite dependency:{" "}
            <span className="font-semibold text-text">"{act.newValue}"</span>
          </span>
        );
      case "TIME_LOGGED":
        return (
          <span>
            logged <span className="font-semibold text-primary">{act.newValue}</span> of work
            {act.metadata && (
              <span className="italic text-muted font-normal"> — "{act.metadata}"</span>
            )}
          </span>
        );
      case "TASK_CREATED":
        return <span>created this task</span>;
      default:
        return (
          <span>
            {act.action} {act.newValue && `(${act.newValue})`}
          </span>
        );
    }
  };

  // Dependency handlers
  const availablePrereqTasks = (allTasks || []).filter(
    (t) =>
      t.id !== task.id &&
      !dependencies.some((d) => d.dependsOnTaskId === t.id)
  );

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrereqTaskId) return;

    setIsSubmittingDep(true);
    setDependencyError(null);

    const prereqTask = (allTasks || []).find(
      (t) => t.id === selectedPrereqTaskId
    );
    const tempId = `temp-${Date.now()}`;

    if (prereqTask) {
      setDependencies((prev) => [
        ...prev,
        {
          id: tempId,
          dependentTaskId: task.id,
          dependsOnTaskId: prereqTask.id,
          dependsOnTask: {
            id: prereqTask.id,
            title: prereqTask.title,
            status: prereqTask.status,
            priority: prereqTask.priority,
            dueDate: prereqTask.dueDate,
          },
        },
      ]);
    }

    const res = await addDependencyAction({
      taskId: task.id,
      dependsOnTaskId: selectedPrereqTaskId,
    });

    if (res.error) {
      setDependencyError(res.error);
      setDependencies((prev) => prev.filter((d) => d.id !== tempId));
    } else if (res.dependencyId) {
      setDependencies((prev) =>
        prev.map((d) =>
          d.id === tempId ? { ...d, id: res.dependencyId! } : d
        )
      );
      setSelectedPrereqTaskId("");
      setIsAddingDependency(false);
    }
    setIsSubmittingDep(false);
  };

  const handleRemoveDependency = async (dependsOnTaskId: string) => {
    setDependencies((prev) =>
      prev.filter((d) => d.dependsOnTaskId !== dependsOnTaskId)
    );
    startTransition(async () => {
      await removeDependencyAction({
        taskId: task.id,
        dependsOnTaskId,
      });
    });
  };

  // Comment @mention parsing
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewCommentText(text);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursor);
    const lastAtMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\.\s]*)$/);

    if (lastAtMatch) {
      setMentionQuery(lastAtMatch[1].toLowerCase());
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (member: {
    id: string;
    name: string | null;
    email: string | null;
  }) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = newCommentText.slice(0, cursor);
    const textAfterCursor = newCommentText.slice(cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const memberDisplayName =
        member.name || member.email?.split("@")[0] || "member";
      const newText =
        textBeforeCursor.slice(0, lastAtIndex) +
        `@${memberDisplayName} ` +
        textAfterCursor;

      setNewCommentText(newText);
      setMentionedUserIds((prev) => Array.from(new Set([...prev, member.id])));
      setMentionQuery(null);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const filteredMentionMembers =
    mentionQuery !== null
      ? teamMembers.filter(
          (m) =>
            (m.name && m.name.toLowerCase().includes(mentionQuery)) ||
            (m.email && m.email.toLowerCase().includes(mentionQuery))
        )
      : [];

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const tempId = `temp-${Date.now()}`;
    const commentContent = newCommentText.trim();
    const commentMentions = [...mentionedUserIds];

    const optimisticComment: TaskComment = {
      id: tempId,
      content: commentContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: currentUser?.id || "unknown",
        name: "You",
        email: null,
        image: null,
      },
    };

    setComments((prev) => [...prev, optimisticComment]);
    setNewCommentText("");
    setMentionedUserIds([]);
    setMentionQuery(null);

    const formData = new FormData();
    formData.append("taskId", task.id);
    formData.append("content", commentContent);
    formData.append("mentionedUserIds", JSON.stringify(commentMentions));

    const res = await createCommentAction({}, formData);
    if (res.commentId) {
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? { ...c, id: res.commentId! } : c))
      );
    }
    setIsSubmittingComment(false);
  };

  const handleStartEditComment = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    const newContent = editingCommentText.trim();
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, content: newContent, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setEditingCommentId(null);

    const formData = new FormData();
    formData.append("commentId", commentId);
    formData.append("content", newContent);

    await updateCommentAction({}, formData);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    startTransition(async () => {
      const formData = new FormData();
      formData.append("commentId", commentId);
      await deleteCommentAction({}, formData);
    });
  };

  // Attachment upload handler (PRD.md §6.5.7)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentError(null);
    setIsUploadingFile(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticAttachment: TaskAttachment = {
      id: tempId,
      fileName: file.name,
      fileUrl: "#",
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      createdAt: new Date().toISOString(),
      uploader: {
        id: currentUser?.id || "unknown",
        name: "You",
        email: null,
      },
    };

    setAttachments((prev) => [optimisticAttachment, ...prev]);

    const formData = new FormData();
    formData.append("taskId", task.id);
    formData.append("file", file);

    const res = await uploadAttachmentAction({}, formData);
    if (res.error) {
      setAttachmentError(res.error);
      setAttachments((prev) => prev.filter((a) => a.id !== tempId));
    } else if (res.attachmentId) {
      // Re-fetch or update the ID
      setAttachments((prev) =>
        prev.map((a) => (a.id === tempId ? { ...a, id: res.attachmentId! } : a))
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsUploadingFile(false);
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    startTransition(async () => {
      const formData = new FormData();
      formData.append("attachmentId", attachmentId);
      await deleteAttachmentAction({}, formData);
    });
  };

  // Helper to render formatted comment text with highlighted mentions
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_\.\-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={i}
            className="bg-primary/10 text-primary border-primary/20 inline-flex items-center rounded border px-1.5 py-0.2 font-semibold"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-card border-border animate-in fade-in zoom-in-95 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6 shadow-2xl duration-150">
        {/* Top Header */}
        <div className="border-border flex items-start justify-between border-b pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted text-xs font-semibold uppercase tracking-wider">
                {task.team.project.name} • {task.team.name}
              </span>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadge(
                  task.priority
                )}`}
              >
                {task.priority} Priority
              </span>
              {isOverdue && (
                <span className="bg-danger/15 text-danger border-danger/30 rounded border px-2 py-0.5 text-[10px] font-bold uppercase">
                  Overdue
                </span>
              )}
            </div>
            <h2 className="text-text text-xl font-bold tracking-tight">
              {task.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="gap-1.5 text-xs"
            >
              <Edit className="size-3.5" />
              <span>Edit</span>
            </Button>
            <button
              onClick={onClose}
              className="text-muted hover:text-text rounded-md p-1.5"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="space-y-6 pt-5">
          {/* Soft Warning Banner (PRD.md §6.5.8) */}
          {softWarning && (
            <div className="border-warning/30 bg-warning/10 text-warning flex items-center justify-between gap-3 rounded-lg border p-3.5 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-4 shrink-0" />
                <p>{softWarning}</p>
              </div>
              <button
                type="button"
                onClick={() => setSoftWarning(null)}
                className="hover:opacity-75"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-1.5">
              <h4 className="text-text text-xs font-semibold">Description</h4>
              <p className="text-muted bg-background border-border rounded-lg border p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Metadata Grid (Status, Assignee, Due Date, Recurrence, Time) */}
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-background border border-border p-4 sm:grid-cols-3 md:grid-cols-5">
            {/* Status Selector */}
            <div className="space-y-1">
              <span className="text-muted text-[11px] font-semibold">
                Status
              </span>
              <select
                value={currentStatus}
                onChange={(e) =>
                  handleStatusChange(e.target.value as TaskStatus)
                }
                className="border-border bg-card text-text focus:ring-primary w-full rounded-md border px-2 py-1 text-xs font-semibold focus:ring-1 focus:outline-none"
              >
                <option value={TaskStatus.TODO}>To Do</option>
                <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                <option value={TaskStatus.DONE}>Done</option>
              </select>
            </div>

            {/* Assignee Selector */}
            <div className="space-y-1">
              <span className="text-muted text-[11px] font-semibold">
                Assignee
              </span>
              <select
                defaultValue={task.assignee?.id || "UNASSIGNED"}
                onChange={(e) => {
                  const newAssigneeId = e.target.value;
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.append("taskId", task.id);
                    fd.append("assigneeId", newAssigneeId);
                    await updateTaskAssigneeAction({}, fd);
                  });
                }}
                className="border-border bg-card text-text focus:ring-primary w-full rounded-md border px-2 py-1 text-xs focus:ring-1 focus:outline-none"
              >
                <option value="UNASSIGNED">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date Display */}
            <div className="space-y-1">
              <span className="text-muted text-[11px] font-semibold">
                Due Date
              </span>
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                <Calendar className="text-muted size-3.5" />
                <span
                  className={
                    isOverdue ? "text-danger font-semibold" : "text-text"
                  }
                >
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No due date"}
                </span>
              </div>
            </div>

            {/* Recurrence Display */}
            <div className="space-y-1">
              <span className="text-muted text-[11px] font-semibold">
                Recurrence
              </span>
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                <Repeat className="text-muted size-3.5" />
                <span
                  className={
                    task.recurrence && task.recurrence !== "NONE"
                      ? "text-primary font-medium"
                      : "text-muted"
                  }
                >
                  {task.recurrence === "DAILY"
                    ? "Daily"
                    : task.recurrence === "WEEKLY"
                    ? "Weekly"
                    : task.recurrence === "MONTHLY"
                    ? "Monthly"
                    : "None"}
                </span>
              </div>
            </div>

            {/* Time Display (PRD §6.5.10) */}
            <div className="space-y-1">
              <span className="text-muted text-[11px] font-semibold">
                Time (Logged / Est)
              </span>
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                <Clock className="text-muted size-3.5" />
                <span className="text-text font-medium">
                  {totalLoggedHoursFormatted}h
                  {estimateHours != null ? ` / ${estimateHours}h` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* Subtasks Section (PRD.md §6.5.4) */}
          {/* =================================================================== */}
          <div className="border-border space-y-3 rounded-xl border p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="text-primary size-4" />
                <h3 className="text-text text-xs font-bold uppercase tracking-wider">
                  Subtasks Checklist
                </h3>
              </div>
              <span className="text-muted text-xs font-semibold">
                {completedCount}/{totalSubtasks} completed ({completionPercentage}%)
              </span>
            </div>

            {/* Progress Bar */}
            {totalSubtasks > 0 && (
              <div className="bg-muted/20 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            )}

            {/* Subtask items list */}
            <div className="space-y-1.5 pt-1">
              {subtasks.length === 0 ? (
                <p className="text-muted py-2 text-center text-xs">
                  No subtasks added yet. Add subtasks to break down this work.
                </p>
              ) : (
                subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="border-border/50 bg-background/60 hover:bg-background group flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleSubtask(subtask.id, subtask.isCompleted)
                      }
                      className="flex items-center gap-2.5 text-left"
                    >
                      {subtask.isCompleted ? (
                        <CheckSquare className="text-primary size-4 shrink-0" />
                      ) : (
                        <Square className="text-muted size-4 shrink-0" />
                      )}
                      <span
                        className={
                          subtask.isCompleted
                            ? "text-muted line-through"
                            : "text-text font-medium"
                        }
                      >
                        {subtask.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete subtask"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add a new subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 flex-1 rounded-lg border px-3 py-1.5 text-xs transition-all focus:ring-1 focus:outline-none"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                className="bg-primary hover:bg-primary/90 text-xs text-white"
              >
                <Plus className="size-3.5" />
                <span>Add</span>
              </Button>
            </form>
          </div>

          {/* =================================================================== */}
          {/* Labels & Tags Section (PRD.md §6.5.5) */}
          {/* =================================================================== */}
          <div className="border-border space-y-3 rounded-xl border p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="text-secondary size-4" />
                <h3 className="text-text text-xs font-bold uppercase tracking-wider">
                  Labels & Tags
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingLabel(!isCreatingLabel)}
                className="text-primary hover:text-primary/80 text-xs font-semibold"
              >
                {isCreatingLabel ? "Cancel" : "+ New Label"}
              </button>
            </div>

            {/* Attached Labels List */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {labels.length === 0 ? (
                <span className="text-muted text-xs">No labels attached.</span>
              ) : (
                labels.map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: label.color }}
                  >
                    <span>{label.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleLabel(label)}
                      className="hover:text-black/60 transition-colors"
                      title="Remove label"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Existing Team Labels Picker */}
            {teamLabels.length > 0 && (
              <div className="border-border/60 border-t pt-3">
                <span className="text-muted block text-[11px] font-semibold">
                  Click to attach/detach team labels:
                </span>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {teamLabels.map((tLabel) => {
                    const isAttached = labels.some((l) => l.id === tLabel.id);
                    return (
                      <button
                        key={tLabel.id}
                        type="button"
                        onClick={() => handleToggleLabel(tLabel)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all ${
                          isAttached
                            ? "border-transparent text-white ring-2 ring-offset-1"
                            : "bg-background border-border text-text hover:border-primary/50"
                        }`}
                        style={{
                          backgroundColor: isAttached
                            ? tLabel.color
                            : undefined,
                        }}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: tLabel.color }}
                        />
                        <span>{tLabel.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create Label Form */}
            {isCreatingLabel && (
              <form
                onSubmit={handleCreateLabel}
                className="border-border bg-background/80 space-y-3 rounded-lg border p-3 pt-3"
              >
                <div className="space-y-1">
                  <label className="text-text block text-[11px] font-semibold">
                    Label Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bug, Urgency, Backend"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="border-border bg-card text-text focus:border-primary w-full rounded-md border px-2.5 py-1 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-text block text-[11px] font-semibold">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewLabelColor(c)}
                        className={`size-6 rounded-full transition-transform ${
                          newLabelColor === c
                            ? "scale-110 ring-2 ring-primary ring-offset-2"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingLabel(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs text-white"
                  >
                    Create & Attach
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* =================================================================== */}
          {/* Time Tracking & Estimates Section (PRD.md §6.5.10) */}
          {/* =================================================================== */}
          <div className="border-border space-y-4 rounded-xl border p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-primary size-4" />
                <h3 className="text-text text-xs font-bold uppercase tracking-wider">
                  Time Tracking & Estimates
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted text-xs font-semibold">
                  {totalLoggedHoursFormatted}h logged
                  {estimateHours != null ? ` / ${estimateHours}h estimated` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoggingTime(!isLoggingTime);
                    setTimeError(null);
                  }}
                  className="text-primary hover:text-primary/80 text-xs font-semibold"
                >
                  {isLoggingTime ? "Cancel" : "+ Log Time"}
                </button>
              </div>
            </div>

            {/* Estimate vs Logged Progress Bar */}
            {estimateHours != null && estimateHours > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted font-medium">Estimate Progress</span>
                  <span
                    className={`font-bold ${
                      isOverEstimate ? "text-amber-500" : "text-text"
                    }`}
                  >
                    {Math.round(((totalLoggedMinutes / 60) / estimateHours) * 100)}%
                    {isOverEstimate && " (Over Estimate)"}
                  </span>
                </div>
                <div className="bg-muted/20 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isOverEstimate ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {timeError && (
              <div className="border-danger/30 bg-danger/10 text-danger flex items-center gap-2 rounded-lg border p-2.5 text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{timeError}</span>
              </div>
            )}

            {/* Inline Log Time Form */}
            {isLoggingTime && (
              <form
                onSubmit={handleLogTime}
                className="border-border bg-background/80 space-y-3 rounded-lg border p-3"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-text block text-[11px] font-semibold">
                      Hours
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="e.g. 1.5"
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      className="border-border bg-card text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-text block text-[11px] font-semibold">
                      Minutes (optional)
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max="59"
                      placeholder="e.g. 30"
                      value={logMinutes}
                      onChange={(e) => setLogMinutes(e.target.value)}
                      className="border-border bg-card text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-text block text-[11px] font-semibold">
                    Work Description / Note
                  </label>
                  <input
                    type="text"
                    placeholder="What did you work on?"
                    value={logNote}
                    onChange={(e) => setLogNote(e.target.value)}
                    className="border-border bg-card text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLoggingTime(false);
                      setTimeError(null);
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingTime}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs text-white"
                  >
                    {isSubmittingTime ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <span>Save Time Entry</span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Time Entries Log List */}
            <div className="space-y-2">
              <span className="text-muted block text-[11px] font-semibold uppercase tracking-wider">
                Logged Work Entries ({timeEntries.length})
              </span>

              {timeEntries.length === 0 ? (
                <p className="text-muted bg-background/40 border-border/50 rounded-lg border p-3 text-center text-xs">
                  No time logged yet. Click "+ Log Time" to record hours spent.
                </p>
              ) : (
                <div className="space-y-2">
                  {timeEntries.map((entry) => {
                    const isAuthor =
                      currentUser && entry.user?.id === currentUser.id;
                    const canDelete =
                      isAuthor ||
                      currentUser?.orgRole === OrgRole.ORG_OWNER ||
                      currentUser?.orgRole === OrgRole.ORG_ADMIN;

                    return (
                      <div
                        key={entry.id}
                        className="border-border/60 bg-background/60 hover:bg-background group flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                            {(
                              entry.user?.name?.[0] ||
                              entry.user?.email?.[0] ||
                              "U"
                            ).toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-text font-semibold">
                                {formatDuration(entry.durationMinutes)}
                              </span>
                              <span className="text-muted text-[10px]">
                                by {entry.user?.name || entry.user?.email || "User"}
                              </span>
                              <span className="text-muted/60 text-[10px]">
                                •{" "}
                                {new Date(entry.loggedAt).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                            {entry.note && (
                              <p className="text-muted text-[11px] italic">
                                "{entry.note}"
                              </p>
                            )}
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTimeEntry(entry.id)}
                            className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete time entry"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* =================================================================== */}
          {/* Task Dependencies & Prerequisites Section (PRD.md §6.5.8) */}
          {/* =================================================================== */}
          <div className="border-border space-y-4 rounded-xl border p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="text-primary size-4" />
                <h3 className="text-text text-xs font-bold uppercase tracking-wider">
                  Task Dependencies
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted text-xs font-semibold">
                  {dependencies.length} prerequisite{dependencies.length !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingDependency(!isAddingDependency);
                    setDependencyError(null);
                  }}
                  className="text-primary hover:text-primary/80 text-xs font-semibold"
                >
                  {isAddingDependency ? "Cancel" : "+ Add Prerequisite"}
                </button>
              </div>
            </div>

            {dependencyError && (
              <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-2 rounded-lg border p-2.5 text-xs">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <p>{dependencyError}</p>
              </div>
            )}

            {/* Add Prerequisite Form */}
            {isAddingDependency && (
              <form
                onSubmit={handleAddDependency}
                className="border-border bg-background/80 space-y-3 rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <label className="text-text block text-[11px] font-semibold">
                    Select prerequisite task that must be completed first:
                  </label>
                  <select
                    value={selectedPrereqTaskId}
                    onChange={(e) => setSelectedPrereqTaskId(e.target.value)}
                    className="border-border bg-card text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-1 focus:outline-none"
                  >
                    <option value="">-- Choose a task --</option>
                    {availablePrereqTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status}) — {t.team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingDependency(false);
                      setDependencyError(null);
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!selectedPrereqTaskId || isSubmittingDep}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs text-white"
                  >
                    {isSubmittingDep ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <span>Add Prerequisite</span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Prerequisites List ("Depends On") */}
            <div className="space-y-2">
              <span className="text-muted block text-[11px] font-semibold uppercase tracking-wider">
                Prerequisites (Must be completed first)
              </span>

              {dependencies.length === 0 ? (
                <p className="text-muted bg-background/40 border-border/50 rounded-lg border p-3 text-center text-xs">
                  No prerequisites. This task can be worked on anytime.
                </p>
              ) : (
                <div className="space-y-2">
                  {dependencies.map((dep) => {
                    const isPrereqDone =
                      dep.dependsOnTask.status === TaskStatus.DONE;
                    return (
                      <div
                        key={dep.id}
                        className="border-border/60 bg-background/60 hover:bg-background group flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isPrereqDone
                                ? "border-success/30 bg-success/15 text-success"
                                : "border-warning/30 bg-warning/15 text-warning"
                            }`}
                          >
                            {dep.dependsOnTask.status}
                          </span>

                          <div className="space-y-0.5">
                            <span className="text-text font-semibold">
                              {dep.dependsOnTask.title}
                            </span>
                            {!isPrereqDone && (
                              <span className="text-warning block text-[10px] font-semibold">
                                ⚠️ Incomplete prerequisite
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveDependency(dep.dependsOnTaskId)
                          }
                          className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove dependency"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Downstream Tasks ("Blocks") */}
            {dependents.length > 0 && (
              <div className="border-border/60 space-y-2 border-t pt-3">
                <span className="text-muted block text-[11px] font-semibold uppercase tracking-wider">
                  Downstream Tasks (Waiting on this task)
                </span>
                <div className="space-y-2">
                  {dependents.map((dep) => (
                    <div
                      key={dep.id}
                      className="border-border/60 bg-background/40 flex items-center justify-between rounded-lg border p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="border-border bg-card text-muted inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase">
                          {dep.dependentTask.status}
                        </span>
                        <span className="text-text font-semibold">
                          {dep.dependentTask.title}
                        </span>
                      </div>
                      <span className="text-muted text-[10px]">
                        Dependent
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* =================================================================== */}
          {/* File Attachments Section (PRD.md §6.5.7, ARCHITECTURE.md §1/6) */}
          {/* =================================================================== */}
          <div className="border-border space-y-4 rounded-xl border p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="text-primary size-4" />
                <h3 className="text-text text-xs font-bold uppercase tracking-wider">
                  File Attachments ({attachments.length})
                </h3>
              </div>

              <label
                htmlFor="task-file-upload"
                className="bg-primary hover:bg-primary/90 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition-colors"
              >
                {isUploadingFile ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                <span>Upload File</span>
              </label>
              <input
                ref={fileInputRef}
                id="task-file-upload"
                type="file"
                disabled={isUploadingFile}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {attachmentError && (
              <div className="border-danger/30 bg-danger/10 text-danger flex items-center gap-2 rounded-lg border p-2.5 text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{attachmentError}</span>
              </div>
            )}

            {/* Attachments List */}
            {attachments.length === 0 ? (
              <div className="text-muted border-border/50 bg-background/50 rounded-lg border border-dashed py-6 text-center text-xs">
                <Paperclip className="text-muted/40 mx-auto size-6" />
                <p className="mt-1.5 font-medium">No attachments uploaded yet.</p>
                <p className="text-muted/70 text-[11px]">
                  Upload documents, screenshots, or project specs (Max 25MB).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {attachments.map((att) => {
                  const isUploader =
                    currentUser && att.uploader?.id === currentUser.id;
                  const canDelete =
                    isUploader ||
                    currentUser?.orgRole === OrgRole.ORG_OWNER ||
                    currentUser?.orgRole === OrgRole.ORG_ADMIN;

                  return (
                    <div
                      key={att.id}
                      className="border-border/60 bg-background/60 hover:bg-background group flex items-center justify-between rounded-xl border p-3 text-xs transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="bg-card border-border/80 flex size-8 shrink-0 items-center justify-center rounded-lg border">
                          {getFileIcon(att.mimeType)}
                        </div>
                        <div className="min-w-0">
                          <a
                            href={att.fileUrl}
                            download={att.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text hover:text-primary block truncate font-medium transition-colors"
                            title={att.fileName}
                          >
                            {att.fileName}
                          </a>
                          <div className="text-muted flex items-center gap-1.5 text-[10px]">
                            <span>{formatFileSize(att.fileSize)}</span>
                            <span>•</span>
                            <span>{att.uploader?.name || "Uploaded"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <a
                          href={att.fileUrl}
                          download={att.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-text rounded-md p-1.5 transition-colors"
                          title="Download file"
                        >
                          <Download className="size-3.5" />
                        </a>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete attachment "${att.fileName}"?`
                                )
                              ) {
                                handleDeleteAttachment(att.id);
                              }
                            }}
                            className="text-muted hover:text-danger rounded-md p-1.5 transition-colors"
                            title="Delete attachment"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =================================================================== */}
          {/* Comments & Discussion Thread Section (PRD.md §6.5.6, §6.6.1) */}
          {/* =================================================================== */}
          <div className="border-border space-y-4 rounded-xl border p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-primary size-4" />
                <h3 className="text-text text-xs font-bold uppercase tracking-wider">
                  Comments & Discussion ({comments.length})
                </h3>
              </div>
            </div>

            {/* Comment List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-muted border-border/50 bg-background/50 rounded-lg border border-dashed py-6 text-center text-xs">
                  <MessageSquare className="text-muted/40 mx-auto size-6" />
                  <p className="mt-1.5 font-medium">No comments yet.</p>
                  <p className="text-muted/70 text-[11px]">
                    Discuss progress, blockers, or @mention team members.
                  </p>
                </div>
              ) : (
                comments.map((comment) => {
                  const isAuthor =
                    currentUser && comment.author?.id === currentUser.id;
                  const isEditing = editingCommentId === comment.id;
                  const isEdited =
                    new Date(comment.updatedAt).getTime() -
                      new Date(comment.createdAt).getTime() >
                    1000;

                  return (
                    <div
                      key={comment.id}
                      className="border-border/60 bg-background/60 hover:bg-background group rounded-xl border p-3.5 text-xs transition-colors"
                    >
                      {/* Author header */}
                      <div className="flex items-center justify-between gap-2 pb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/15 text-primary flex size-6 items-center justify-center rounded-full text-[10px] font-bold">
                            {(
                              comment.author?.name?.[0] ||
                              comment.author?.email?.[0] ||
                              "U"
                            ).toUpperCase()}
                          </div>
                          <span className="text-text font-semibold">
                            {comment.author?.name ||
                              comment.author?.email ||
                              "Team Member"}
                          </span>
                          <span className="text-muted text-[10px]">
                            {new Date(comment.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          {isEdited && (
                            <span className="text-muted text-[10px] italic">
                              (edited)
                            </span>
                          )}
                        </div>

                        {/* Actions: Edit only if author, Delete if author or admin */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAuthor && !isEditing && (
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(comment)}
                              className="text-muted hover:text-text p-1"
                              title="Edit comment"
                            >
                              <Edit className="size-3.5" />
                            </button>
                          )}

                          {(isAuthor ||
                            currentUser?.orgRole === OrgRole.ORG_OWNER ||
                            currentUser?.orgRole === OrgRole.ORG_ADMIN) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-muted hover:text-danger p-1"
                              title="Delete comment"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Content or Edit Form */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) =>
                              setEditingCommentText(e.target.value)
                            }
                            rows={2}
                            className="border-border bg-card text-text focus:border-primary w-full rounded-md border p-2 text-xs focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCommentId(null)}
                              className="h-6 px-2 text-[11px]"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveEditComment(comment.id)}
                              className="bg-primary hover:bg-primary/90 h-6 px-2.5 text-[11px] text-white"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-text pt-0.5 leading-relaxed whitespace-pre-wrap">
                          {renderCommentContent(comment.content)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Input with @Mention Autocomplete */}
            <div className="relative pt-2">
              {/* @Mention Suggestion Box */}
              {mentionQuery !== null && filteredMentionMembers.length > 0 && (
                <div className="border-border bg-card animate-in fade-in-50 zoom-in-95 absolute bottom-full left-0 z-20 mb-1 max-h-48 w-64 overflow-y-auto rounded-xl border p-1 shadow-xl">
                  <div className="text-muted border-border border-b px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
                    Mention team member
                  </div>
                  {filteredMentionMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelectMention(member)}
                      className="hover:bg-background/80 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                    >
                      <div className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                        {(
                          member.name?.[0] ||
                          member.email?.[0] ||
                          "U"
                        ).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="text-text block font-medium">
                          {member.name || member.email}
                        </span>
                        {member.name && (
                          <span className="text-muted block text-[10px]">
                            {member.email}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} className="space-y-2">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={3}
                    placeholder="Write a comment... (type @ to mention a team member)"
                    value={newCommentText}
                    onChange={handleCommentChange}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-xl border p-3 text-xs transition-all focus:ring-2 focus:outline-none"
                  />
                  <div className="text-muted pointer-events-none absolute right-3 bottom-3 flex items-center gap-1 text-[11px]">
                    <AtSign className="size-3.5" />
                    <span>Mentions enabled</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted text-[11px]">
                    Pro tip: Type <code className="bg-muted/15 rounded px-1">@name</code> to notify a teammate
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !newCommentText.trim() || isSubmittingComment
                    }
                    className="bg-primary hover:bg-primary/90 gap-1.5 text-xs text-white shadow-xs"
                  >
                    {isSubmittingComment ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>Post Comment</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* =================================================================== */}
          {/* Activity Log Section (PRD.md §6.5.11) — Read-Only */}
          {/* =================================================================== */}
          <div className="border-border space-y-4 rounded-xl border p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="text-primary size-4" />
                <h3 className="text-text text-xs font-bold uppercase tracking-wider">
                  Activity Log ({activities.length})
                </h3>
              </div>
              <span className="text-muted text-[11px] italic">
                Read-only audit trail
              </span>
            </div>

            {activities.length === 0 ? (
              <p className="text-muted bg-background/40 border-border/50 rounded-lg border p-3 text-center text-xs">
                No activity recorded for this task yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="border-border/60 bg-background/40 flex items-start gap-3 rounded-lg border p-3 text-xs"
                  >
                    <div className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                      {(
                        act.actor?.name?.[0] ||
                        act.actor?.email?.[0] ||
                        "A"
                      ).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-text font-bold">
                          {act.actor?.name || act.actor?.email || "System"}
                        </span>
                        <span className="text-muted">
                          {renderActivityDescription(act)}
                        </span>
                      </div>
                      <span className="text-muted/60 block text-[10px]">
                        {new Date(act.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
