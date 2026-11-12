// 사용: node mkcut.js '<JOBS JSON>'  → cutmob.run.js 생성
// 결과 저장: node mkcut.js --save <frames.json>  → assets/mobs/*.png
const fs = require('fs');
const S = __dirname;
if (process.argv[2] === '--save') {
  const t = fs.readFileSync(process.argv[3], 'utf8');
  let o = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); if (typeof o === 'string') o = JSON.parse(o);
  const dir = require('path').join(__dirname, '../../assets/') + '/' + (process.argv[4] || 'mobs');
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, v] of Object.entries(o)) fs.writeFileSync(dir + '/' + k + '.png', Buffer.from(v.split(',')[1], 'base64'));
  console.log('saved', Object.keys(o).length);
} else {
  const tpl = fs.readFileSync(S + '/cutmob.template.js', 'utf8');
  fs.writeFileSync(S + '/cutmob.run.js', tpl.replace('__JOBS__', process.argv[2]));
  console.log('ok');
}
