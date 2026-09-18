import { Router, type Request } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { db, userSyncDataTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function currentUserId(req: Request): string {
  const auth = getAuth(req);
  const userId = auth.sessionClaims?.userId || auth.userId;
  if (typeof userId !== "string" || !userId) throw new Error("Authenticated user is missing");
  return userId;
}

function toResponse(row: typeof userSyncDataTable.$inferSelect | undefined) {
  return {
    snapshot: row?.data ?? null,
    revision: row?.revision ?? 0,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
}

router.use(requireAuth);

router.get("/sync", async (req, res) => {
  const userId = currentUserId(req);
  const [row] = await db
    .select()
    .from(userSyncDataTable)
    .where(eq(userSyncDataTable.userId, userId))
    .limit(1);
  res.json(toResponse(row));
});

router.put("/sync", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const snapshot = body.snapshot && typeof body.snapshot === "object" && !Array.isArray(body.snapshot)
    ? body.snapshot as Record<string, unknown>
    : null;
  const baseRevision = body.baseRevision;
  if (!snapshot || (baseRevision !== undefined && (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 0))) {
    res.status(400).json({ error: "Invalid sync payload" });
    return;
  }

  const userId = currentUserId(req);
  const result = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(userSyncDataTable)
      .where(eq(userSyncDataTable.userId, userId))
      .limit(1);

    if (current && baseRevision !== undefined && baseRevision !== current.revision) {
      return { conflict: true as const, response: toResponse(current) };
    }

    if (!current) {
      const [created] = await tx
        .insert(userSyncDataTable)
        .values({ userId, revision: 1, data: snapshot })
        .returning();
      return { conflict: false as const, response: toResponse(created) };
    }

    const [updated] = await tx
      .update(userSyncDataTable)
      .set({
        data: snapshot,
        revision: current.revision + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(userSyncDataTable.userId, userId), eq(userSyncDataTable.revision, current.revision)))
      .returning();

    return updated
      ? { conflict: false as const, response: toResponse(updated) }
      : { conflict: true as const, response: toResponse(current) };
  });

  res.status(result.conflict ? 409 : 200).json(result.response);
});

export default router;