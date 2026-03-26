import sanitizeHtml from "sanitize-html";
import { createHash } from "crypto";

export const sanitizeNewsHtml = (input: string) =>
  sanitizeHtml(input || "", {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      a: ["href", "name", "target"],
      img: ["src", "alt"],
      "*": ["class"]
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" })
    }
  });

export const normalizeTitle = (title: string) =>
  (title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const hashKey = (value: string) => createHash("sha256").update(value).digest("hex");

export const slugify = (text: string) =>
  (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
