/**
 * Basic Authentication & Authorization
 *
 * NOTE: This is a lightweight auth layer for development.
 * For production, replace with Clerk, NextAuth, or a proper auth provider.
 */

import { NextRequest, NextResponse } from "next/server";

export interface AuthResult {
  userId: string;
  isAnonymous: boolean;
}

const DEV_AUTH_SECRET = process.env.DEV_AUTH_SECRET;

/**
 * Extract and minimally validate the user from request headers.
 * Returns the userId or "anonymous" if no header is present.
 */
export function getAuthUser(req: NextRequest): AuthResult {
  const userId = req.headers.get("x-user-id") || "anonymous";
  return { userId, isAnonymous: userId === "anonymous" };
}

/**
 * Require a non-anonymous user for state-changing operations.
 * Returns a 401 response if no user ID is provided.
 */
export function requireAuth(req: NextRequest): AuthResult | NextResponse {
  const userId = req.headers.get("x-user-id");

  if (!userId || userId === "anonymous") {
    return NextResponse.json(
      { error: "Authentication required. Provide x-user-id header." },
      { status: 401 }
    );
  }

  // Optional: validate a simple dev token
  const authToken = req.headers.get("x-auth-token");
  if (DEV_AUTH_SECRET && authToken !== DEV_AUTH_SECRET) {
    return NextResponse.json(
      { error: "Invalid authentication token." },
      { status: 401 }
    );
  }

  return { userId, isAnonymous: false };
}

/**
 * Check if the user has access to a project.
 * NOTE: Project schema currently lacks a user_id column.
 * This is a placeholder that will enforce ownership once the schema is migrated.
 */
export async function checkProjectAccess(
  userId: string,
  _projectId: number
): Promise<boolean> {
  void _projectId; // reserved for future ownership check

  // Allow anonymous access for now (dev mode)
  if (userId === "anonymous") return true;

  // Once user_id is added to Project, query prisma here:
  // const project = await prisma.project.findUnique({ where: { id: _projectId } });
  // return project !== null && project.userId === userId;

  return true;
}
