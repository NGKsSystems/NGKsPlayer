/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: importPipeline.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { planForFolder, calculateStats } from "../lib/filenameNormalizer.js";
import path from "node:path";
import fs from "node:fs/promises";

export async function normalizeOnImport(folder, userOpts = {}) {
  const opts = {
    useTags: true,
    useLLM: true,
    model: "anthropic/claude-3.5-sonnet",
    openRouterApiKey: userOpts.openRouterKey || process.env.OPENROUTER_API_KEY,
    flipReversed: true,
    recurse: true,
    bandExceptions: userOpts.bandExceptions || [],
    ...userOpts,
  };

  // Generate normalization plans
  const plans = await planForFolder(folder, opts);
  const stats = calculateStats(plans);
  
  // Filter to only approved files if specified
  let toDo = plans.filter(p => p.status === "plan");
  if (opts.approvedFiles && Array.isArray(opts.approvedFiles)) {
    toDo = toDo.filter(plan => opts.approvedFiles.includes(plan.srcPath));
  }
  
  if (!toDo.length) {
    return { planned: plans, results: [], stats };
  }

  // Execute the approved normalization plans
  const results = await executeNormalization(toDo);
  
  return { planned: plans, results, stats };
}

// Execute normalization plans by actually renaming files
async function executeNormalization(plans) {
  const results = [];
  
  for (const plan of plans) {
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(plan.dstPath);
      await fs.mkdir(destDir, { recursive: true });
      
      // Rename the file
      await fs.rename(plan.srcPath, plan.dstPath);
      
      results.push({
        ...plan,
        status: 'renamed'
      });
      
      console.log(`[executeNormalization] Renamed: ${path.basename(plan.srcPath)} → ${path.basename(plan.dstPath)}`);
    } catch (error) {
      results.push({
        ...plan,
        status: 'error',
        error: error.message
      });
      
      console.error(`[executeNormalization] Failed to rename ${plan.srcPath}:`, error);
    }
  }
  
  return results;
}

