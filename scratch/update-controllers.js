const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../backend/controllers');

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace querying by owner
  content = content.replace(/\{\s*owner:\s*req\.user\._id\s*\}/g, '{ organization: req.organization._id }');
  
  // Replace req.user._id passed as a single param (like to buildPipelineStatus)
  content = content.replace(/buildPipelineStatus\(req\.user\._id\)/g, 'buildPipelineStatus(req.organization._id)');

  // During creation, we usually have `owner: req.user._id` inside an object.
  // We want to add `organization: req.organization._id` next to it.
  // Using a regex to find `owner: req.user._id` that isn't already followed/preceded by organization
  content = content.replace(/owner:\s*req\.user\._id(?!,\s*organization)/g, 'owner: req.user._id, organization: req.organization._id');

  // Same for userId variable if used (e.g. const userId = req.user._id)
  // Wait, let's just do explicit replaces where necessary or let's see where req.user._id is used.

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
