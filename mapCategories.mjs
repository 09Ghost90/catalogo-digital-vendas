import fs from 'fs';
import path from 'path';

const produtosPath = path.resolve('produtos.json');
const publicImagensPath = path.resolve('client/public/imagens_categorias');

if (!fs.existsSync(publicImagensPath)) {
  console.log("publicImagensPath nao encontrado!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(produtosPath, 'utf8'));
const files = fs.readdirSync(publicImagensPath).filter(f => !fs.statSync(path.join(publicImagensPath, f)).isDirectory());

let matched = 0;
let total = 0;

for (const cat in data.categoryImages) {
    total++;
    // O nome do arquivo contem os acentos mantidos, mas em lower case e com `_` no lugar de espacos.
    let raw = cat.toLowerCase().replace(/ /g, '_');
    
    // Pegar o _0001.jpg
    const match = files.find(f => f.startsWith(raw + "_0001"));
    if (match) {
        matched++;
        data.categoryImages[cat] = `/imagens_categorias/${match}`;
        console.log(`Matched ${cat} -> ${match}`);
    } else {
        console.log('UNMATCHED:', cat);
    }
}

fs.writeFileSync(produtosPath, JSON.stringify(data, null, 2));
console.log(`Matched ${matched}/${total} categories!`);
