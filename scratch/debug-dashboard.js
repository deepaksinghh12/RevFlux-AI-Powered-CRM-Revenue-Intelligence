const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Dashboard.jsx', 'utf8');

const startIndex = code.indexOf('<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">');
const endIndex = code.indexOf('function HeroCard'); 
console.log('start', startIndex, 'end', endIndex);
