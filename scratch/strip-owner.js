const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'backend', 'controllers');

const filesToUpdate = [
  'lead.controller.js',
  'contact.controller.js',
  'task.controller.js',
  'note.controller.js',
  'analytics.controller.js'
];

for (const file of filesToUpdate) {
  const filePath = path.join(controllersDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove strict owner checks where organization is present
  content = content.replace(/owner:\s*req\.user\._id,\s*organization:\s*req\.organization\._id/g, 'organization: req.organization._id');
  content = content.replace(/organization:\s*req\.organization\._id,\s*owner:\s*req\.user\._id/g, 'organization: req.organization._id');
  
  // Also instances without trailing commas
  content = content.replace(/owner:\s*req\.user\._id,\s*organization:\s*req\.organization\._id/g, 'organization: req.organization._id');
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
