import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch {
    res.status(401).json({ error: "Authentication failed" });
  }
}

export function internalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secretKey = req.headers["x-secret-key"];

  if (secretKey !== env.internalBridgeSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
