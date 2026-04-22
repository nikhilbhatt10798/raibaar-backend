import { ActivityLog, User } from "../models";

type LogActivityInput = {
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  description: string;
  metadata?: Record<string, unknown>;
};

const buildActorName = async (actorId?: string, actorName?: string) => {
  if (actorName) return actorName;
  if (!actorId) return "System";

  const user = await User.findById(actorId).select("firstName lastName email");
  if (!user) return "Unknown user";

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return fullName || user.email || "Unknown user";
};

export const logActivity = async (input: LogActivityInput) => {
  try {
    const actorName = await buildActorName(input.actorId, input.actorName);

    await ActivityLog.create({
      actorId: input.actorId,
      actorRole: input.actorRole || "system",
      actorName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      description: input.description,
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
};
