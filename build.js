// 사용법: node build.js  →  public/index.html (단일 파일) 생성
const fs = require('fs');
const read = (f) => fs.readFileSync('src/' + f, 'utf8');
const css = read('style.css');
const js = ['expr.js', 'data.js', 'data2.js', 'data3.js', 'gen.js', 'gen2.js', 'core.js', 'app.js', 'party.js', 'ui1.js', 'ui2.js', 'main.js'].map(read).join('\n');
const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ctext x='32' y='48' font-size='44' text-anchor='middle'%3E%F0%9F%A7%A0%3C/text%3E%3C/svg%3E";
const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0b0d1a">
<title>두뇌 배틀</title>
<link rel="icon" href="${icon}">
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<div id="toast"></div>
<script>
(function(){
'use strict';
${js}
})();
</script>
</body>
</html>
`;
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', html);
console.log('public/index.html', html.length, 'bytes');
