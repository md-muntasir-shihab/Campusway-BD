import rateLimit from "express-rate-limit";

export const examSessionStartLimit = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many session start requests. Try again in 1 minute." },
});

export const examAutoSaveLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many save requests. Slow down." },
});

export const examSubmitLimit = rateLimit({
  windowMs: 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many submit requests." },
});
