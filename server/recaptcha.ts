import { Request, Response, NextFunction } from "express";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const SCORE_THRESHOLD = 0.5;

export function createRecaptchaMiddleware(expectedAction: string) {
  return async function (req: Request, res: Response, next: NextFunction) {
    if (!RECAPTCHA_SECRET_KEY) {
      return next();
    }

    const token = req.body?.recaptchaToken;
    if (!token) {
      console.log(`[reCAPTCHA] No token provided, skipping verification`);
      return next();
    }

    try {
      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
      });

      const data = await response.json() as { success: boolean; score?: number; action?: string; hostname?: string; "error-codes"?: string[] };

      if (!data.success) {
        const errorCodes = data["error-codes"] || [];
        console.log(`[reCAPTCHA] Rejected: success=false, errors=${errorCodes.join(",")}`);
        if (errorCodes.includes("invalid-input-secret") || errorCodes.includes("bad-request") || errorCodes.includes("timeout-or-duplicate") || errorCodes.includes("invalid-input-response") || errorCodes.includes("browser-error")) {
          console.log(`[reCAPTCHA] Configuration/token issue detected (${errorCodes.join(",")}), allowing request through`);
          return next();
        }
        return res.status(403).json({ error: "reCAPTCHA verification failed. Please try again." });
      }

      if (data.score !== undefined && data.score < SCORE_THRESHOLD) {
        console.log(`[reCAPTCHA] Rejected: score=${data.score} below threshold ${SCORE_THRESHOLD}`);
        return res.status(403).json({ error: "reCAPTCHA verification failed. Please try again." });
      }

      if (data.action && data.action !== expectedAction) {
        console.log(`[reCAPTCHA] Rejected: action mismatch expected=${expectedAction} got=${data.action}`);
        return res.status(403).json({ error: "reCAPTCHA verification failed. Please try again." });
      }

      next();
    } catch (error) {
      console.error("[reCAPTCHA] Verification error:", error);
      return res.status(503).json({ error: "Security verification temporarily unavailable. Please try again." });
    }
  };
}

export const verifyRecaptcha = createRecaptchaMiddleware("login");
export const verifyRecaptchaRegister = createRecaptchaMiddleware("register");
