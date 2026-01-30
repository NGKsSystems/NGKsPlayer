import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const analyzerConfigMod = await import(pathToFileURL(path.join(process.cwd(), 'src', 'utils', 'analyzerConfig.js')).href);
const exported = analyzerConfigMod.default.exportConfig();
const outDir = path.join(process.cwd(), 'config_exports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'analyzer_config_export.json');
fs.writeFileSync(outPath, exported, 'utf8');
console.log('Wrote config to', outPath);
