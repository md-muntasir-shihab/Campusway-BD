import News from "../models/News";
import { hashKey, normalizeTitle } from "../utils/content";

type DuplicateCheckInput = {
  originalArticleUrl: string;
  rssGuid?: string | null;
  title: string;
};

export const buildDuplicateKeyHash = (input: DuplicateCheckInput) => {
  const key = input.rssGuid || input.originalArticleUrl || normalizeTitle(input.title);
  return hashKey(key);
};

export const findDuplicate = async (input: DuplicateCheckInput) => {
  const reasons: string[] = [];

  const byUrl = await News.findOne({ originalArticleUrl: input.originalArticleUrl }).sort({ createdAt: -1 });
  if (byUrl) reasons.push("same_url");

  let byGuid = null;
  if (input.rssGuid) {
    byGuid = await News.findOne({ rssGuid: input.rssGuid }).sort({ createdAt: -1 });
    if (byGuid) reasons.push("same_guid");
  }

  const normalized = normalizeTitle(input.title);
  const byTitle = await News.findOne({ duplicateKeyHash: hashKey(normalized) }).sort({ createdAt: -1 });
  if (byTitle) reasons.push("similar_title");

  const duplicateOf = byUrl || byGuid || byTitle;
  return {
    duplicate: Boolean(duplicateOf),
    duplicateOfNewsId: duplicateOf?._id || null,
    duplicateReasons: reasons
  };
};
