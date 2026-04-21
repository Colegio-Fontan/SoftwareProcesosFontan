const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/requests/[id]/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace emojis with nothing or generic text where we don't strictly need a Lucide icon
// because setting up the imports via regex is tricky. 
// Or I can just remove them to comply with "no emojis":
content = content.replace(/<span>👤<\/span>/g, '<span className="text-gray-500 mr-1">○</span>');
content = content.replace(/<span>🏢<\/span>/g, '<span className="text-gray-500 mr-1">○</span>');
content = content.replace(/<span>✅<\/span>/g, '<span className="text-green-500 mr-1">✓</span>');
content = content.replace(/⚙️/g, '');
content = content.replace(/📅/g, '');
content = content.replace(/📎/g, '');
content = content.replace(/🔍/g, '');
content = content.replace(/📄/g, '');
content = content.replace(/📤/g, '');
content = content.replace(/⚠️/g, '!');
content = content.replace(/✅/g, '✓');
content = content.replace(/⚡/g, '');
content = content.replace(/↗/g, '');
content = content.replace(/⏳/g, '');
content = content.replace(/🔒/g, '');
content = content.replace(/🗑/g, '');

fs.writeFileSync(file, content);
console.log('Emojis removed from [id]/page.tsx');
