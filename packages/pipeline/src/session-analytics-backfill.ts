import type Database from "@tauri-apps/plugin-sql";
import {
  getMessagesBySession,
  listAllSessions,
  listSessionIdsWithAnalytics,
  upsertSessionAnalytics,
} from "@foldur/db";

const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any",
  "are","aren't","as","at","be","because","been","before","being","below",
  "between","both","but","by","can","can't","cannot","could","couldn't","did",
  "didn't","do","does","doesn't","doing","don't","down","during","each","few",
  "for","from","further","get","got","had","hadn't","has","hasn't","have",
  "haven't","having","he","he'd","he'll","he's","her","here","here's","hers",
  "herself","him","himself","his","how","how's","i","i'd","i'll","i'm","i've",
  "if","in","into","is","isn't","it","it's","its","itself","just","let","let's",
  "like","make","me","might","more","most","much","mustn't","my","myself","need",
  "no","nor","not","now","of","off","on","once","only","or","other","ought",
  "our","ours","ourselves","out","over","own","really","right","said","same",
  "say","shall","shan't","she","she'd","she'll","she's","should","shouldn't",
  "so","some","such","sure","take","than","that","that's","the","their","theirs",
  "them","themselves","then","there","there's","these","they","they'd","they'll",
  "they're","they've","this","those","through","to","too","try","under","until",
  "up","us","use","used","using","very","want","was","wasn't","we","we'd",
  "we'll","we're","we've","well","were","weren't","what","what's","when",
  "when's","where","where's","which","while","who","who's","whom","why","why's",
  "will","with","won't","would","wouldn't","yes","yet","you","you'd","you'll",
  "you're","you've","your","yours","yourself","yourselves",
  "also","already","always","another","back","come","even","every","give","go",
  "going","good","great","help","here","hi","hey","however","keep","know",
  "look","made","many","may","maybe","new","next","old","one","please","put",
  "see","seem","seems","set","show","since","something","still","tell","thing",
  "think","time","two","way","went","will","work","would","year",
  "able","actually","add","added","also","already","code","could","create",
  "data","does","don","example","file","first","following","function","get",
  "given","have","here","how","http","https","instead","keep","know","last",
  "left","line","list","looks","made","make","message","need","new","note",
  "number","okay","part","point","question","rather","run","running","should",
  "something","sorry","start","started","sure","test","text","thanks","that",
  "them","then","there","think","three","update","updated","value","want",
  "what","when","which","will","with","work","write","www",
]);

function extractKeywords(text: string, topN: number): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export interface SessionAnalyticsBackfillResult {
  computed: number;
  skipped: number;
}

export async function ensureSessionAnalyticsUpToDate(
  db: Database,
): Promise<SessionAnalyticsBackfillResult> {
  const sessions = await listAllSessions(db);
  const existing = await listSessionIdsWithAnalytics(db);

  let computed = 0;
  let skipped = 0;

  for (const session of sessions) {
    if (existing.has(session.id)) {
      skipped++;
      continue;
    }

    const messages = await getMessagesBySession(db, session.id);

    const userMsgs = messages.filter((m) => m.role === "user");
    const assistantMsgs = messages.filter((m) => m.role === "assistant");

    const allText = messages.map((m) => m.content_text).join(" ");
    const wordCount = countWords(allText);

    const sorted = [...messages].sort((a, b) => a.sort_order - b.sort_order);
    let durationMinutes: number | null = null;
    if (sorted.length >= 2) {
      const first = sorted[0]!.timestamp ?? session.started_at;
      const last = sorted[sorted.length - 1]!.timestamp ?? session.ended_at;
      if (first && last) {
        const diffMs = new Date(last).getTime() - new Date(first).getTime();
        if (diffMs > 0) {
          durationMinutes = Math.round((diffMs / 60000) * 10) / 10;
        }
      }
    }

    const keywords = extractKeywords(allText, 15);

    await upsertSessionAnalytics(db, {
      session_id: session.id,
      message_count: messages.length,
      user_msg_count: userMsgs.length,
      assistant_msg_count: assistantMsgs.length,
      word_count: wordCount,
      duration_minutes: durationMinutes,
      top_keywords_json: JSON.stringify(keywords),
    });

    computed++;
  }

  return { computed, skipped };
}
