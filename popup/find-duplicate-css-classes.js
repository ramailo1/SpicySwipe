// Node.js script to find duplicate CSS class definitions in popup/styles.css
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');
const css = fs.readFileSync(cssPath, 'utf8');

const classRegex = /^\s*\.([a-zA-Z0-9_-]+)\b/gm;
const classMap = {};

css.split('\n').forEach((line, idx) => {
  let match;
  while ((match = classRegex.exec(line)) !== null) {
    const className = match[1];
    if (!classMap[className]) classMap[className] = [];
    classMap[className].push(idx + 1);
  }
});

const duplicates = Object.entries(classMap).filter(([_, lines]) => lines.length > 1);

if (duplicates.length === 0) {
  console.log('No duplicate class definitions found.');
} else {
  console.log('Duplicate class definitions found:');
  duplicates.forEach(([className, lines]) => {
    console.log(`.${className} defined on lines: ${lines.join(', ')}`);
  });
} 