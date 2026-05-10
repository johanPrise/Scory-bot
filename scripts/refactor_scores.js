import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/api/routes/scores.js');
let code = fs.readFileSync(file, 'utf8');

const regexMap = {
  getId: /\/\*\*\n \* GET \/api\/scores\/:id\n \* Récupérer un score par son ID\n \*\/\nrouter\.get\('\/:id', asyncHandler\(async \(req, res, next\) => \{[\s\S]*?res\.json\(\{ score \}\);\n\}\)\);\n/g,
  putId: /\/\*\*\n \* PUT \/api\/scores\/:id\n \* Mettre à jour un score\n \*\/\nrouter\.put\('\/:id', asyncHandler\(async \(req, res\) => \{[\s\S]*?\}\)\);\n/g,
  deleteId: /\/\*\*\n \* DELETE \/api\/scores\/:id\n \* Supprimer un score\n \*\/\nrouter\.delete\('\/:id', asyncHandler\(async \(req, res\) => \{[\s\S]*?\}\)\);\n/g,
  putApprove: /\/\*\*\n \* PUT \/api\/scores\/:id\/approve\n \* Approuver un score\n \*\/\nrouter\.put\('\/:id\/approve', asyncHandler\(async \(req, res\) => \{[\s\S]*?\}\)\);\n/g,
  putReject: /\/\*\*\n \* PUT \/api\/scores\/:id\/reject\n \* Rejeter un score\n \*\/\nrouter\.put\('\/:id\/reject', asyncHandler\(async \(req, res\) => \{[\s\S]*?\}\)\);\n/g
};

let extractions = {};
for (const [key, regex] of Object.entries(regexMap)) {
  const match = code.match(regex);
  if (match) {
    extractions[key] = match[0];
    code = code.replace(match[0], '');
  }
}

// remove the hack from getId
if (extractions.getId) {
  extractions.getId = extractions.getId.replace(
    / {2}\/\/ Si l'ID n'est pas un ObjectId MongoDB valide[\s\S]*?next\('route'\);\n {2}\}\n\n/, 
    ''
  );
  extractions.getId = extractions.getId.replace('req, res, next', 'req, res');
}

// Append them to the end (before export default router; if it exists)
const appendStr = `\n${extractions.getId}\n${extractions.putId}\n${extractions.deleteId}\n${extractions.putApprove}\n${extractions.putReject}\n`;

if (code.includes('export default router;')) {
  code = code.replace('export default router;', appendStr + '\nexport default router;');
} else {
  code += appendStr;
}

fs.writeFileSync(file, code);
console.log('Done refactoring');
