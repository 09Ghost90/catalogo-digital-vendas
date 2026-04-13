import fs from 'fs';
import path from 'path';

const produtosPath = path.resolve('produtos.json');
const publicImagensPath = path.resolve('client/public/imagens');

if (!fs.existsSync(publicImagensPath)) {
  console.log("publicImagensPath nao encontrado!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(produtosPath, 'utf8'));
const folders = fs.readdirSync(publicImagensPath).filter(f => fs.statSync(path.join(publicImagensPath, f)).isDirectory());

const removeAccents = (str) => str.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");

const getWords = (str) => {
  let s = str.toLowerCase();
  s = s.split('c/').join('com ');
  s = s.split('p/').join('para ');
  s = removeAccents(s);
  return s.split(/[^a-z0-9]+/g).filter(Boolean);
};

const folderWordsList = folders.map(f => ({
  name: f,
  words: getWords(f)
}));

let matched = 0;
let total = 0;

for (const cat in data.categorias) {
  for (const product of data.categorias[cat]) {
    total++;
    let bestMatch = null;
    let maxOverlap = 0;

    const targetWords = getWords(product.nome_completo);

    for (const folder of folderWordsList) {
      let overlap = 0;
      for (const w of folder.words) {
        if (targetWords.includes(w)) overlap++;
      }
      
      // Calculate a score to break ties: overlap count.
      // If same overlap, prefer the one where the first word matches.
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatch = folder;
      } else if (overlap > 0 && overlap === maxOverlap && bestMatch) {
         if (folder.words[0] === targetWords[0] && bestMatch.words[0] !== targetWords[0]) {
            bestMatch = folder;
         }
      }
    }

    if (maxOverlap > 0 && (maxOverlap >= bestMatch.words.length * 0.5 || bestMatch.words[0] === targetWords[0])) {
      matched++;
      const folderPath = path.join(publicImagensPath, bestMatch.name);
      const images = fs.readdirSync(folderPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp') || f.endsWith('.jpeg'));
      product.imagens = images.map(img => `/imagens/${bestMatch.name}/${img}`);
    } else {
      product.imagens = [];
      console.log('UNMATCHED:', product.nome_completo, '| TARGET:', targetWords);
    }
  }
}

fs.writeFileSync(produtosPath, JSON.stringify(data, null, 2));
console.log(`Matched ${matched}/${total}`);
