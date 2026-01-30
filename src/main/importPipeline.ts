import { planForFolder, applyPlans, writeUndoMap, type NormalizerOptions } from "../lib/filenameNormalizer";
import path from "node:path";

export async function normalizeOnImport(folder: string, userOpts: Partial<NormalizerOptions> = {}) {
  const opts: NormalizerOptions = {
    useTags: true,
    useLLM: true,
    llmModel: "openrouter/anthropic/claude-3.5-sonnet",
    openRouterKey: process.env.OPENROUTER_API_KEY,
    flipIfTitleDashArtist: true,
    dryRun: false,
    recurse: true,
    ...userOpts,
  };

  const plans = await planForFolder(folder, opts);
  const toDo = plans.filter(p => p.status === "plan");
  if (!toDo.length) return { planned: plans, results: [] };

  const results = await applyPlans(toDo);
  // keep an undo map next to the folder
  await writeUndoMap(results, path.join(folder, ".ngksplayer-normalize-undo.json"));
  return { planned: plans, results };
}
