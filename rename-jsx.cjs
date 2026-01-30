const fs = require('fs');
const path = require('path');

function renameJsToJsx(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      renameJsToJsx(fullPath);
    } else if (file.endsWith('.js') && fullPath.includes('src/components')) {
      const newPath = fullPath.replace(/\.js$/, '.jsx');
      fs.renameSync(fullPath, newPath);
      console.log(`Renamed: ${fullPath} -> ${newPath}`);
    }
  }
}

renameJsToJsx('./src/components');
console.log('✅ All component .js files renamed to .jsx');