import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { getSupabaseAdmin } from "../lib/supabase";

export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req as AuthenticatedRequest).user?.id;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error || !profile || !profile.is_admin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: "Failed to verify admin status" });
  }
}
