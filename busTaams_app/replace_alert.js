import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src', 'pages');

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('alert(')) {
    content = content.replace(/\balert\(/g, "Swal.fire(");
    if (!content.includes("import Swal from 'sweetalert2'")) {
      content = "import Swal from 'sweetalert2';\n" + content;
    }
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
};

const processDirectory = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      replaceInFile(fullPath);
    }
  }
};

processDirectory(srcDir);
