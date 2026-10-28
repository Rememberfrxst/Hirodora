import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='docs/verification/update-v21';await mkdir(dir,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputs=[
  ['chromium-initial.json','/workspace/hirodora-v21-chromium.json','chromium'],
  ['chromium-final.json','/workspace/hirodora-v21-chromium-final.json','chromium'],
  ['webkit-final.json','/workspace/hirodora-v21-webkit-final.json','webkit'],
  ['webkit-production-release.json','/workspace/hirodora-v21-production-release.json','webkit'],
];
const cases=new Map(),runs=[];
for(const [file,path,engine] of inputs){const d=JSON.parse(await readFile(path,'utf8'));await copyFile(path,`${dir}/${file}`);runs.push({file,engine,stats:d.stats});
  const walk=s=>{for(const p of s.specs||[])for(const t of p.tests||[])cases.set(`${engine}: ${p.title}`,t.results.at(-1)?.status);for(const child of s.suites||[])walk(child);};d.suites.forEach(walk);
}
if(cases.size!==21||[...cases.values()].some(s=>s!=='passed'))throw Error('Incomplete selected browser checks '+JSON.stringify([...cases]));
for(const [source,dest] of [
  ['/workspace/hirodora-v21-unit.txt','unit-tests.txt'],['/workspace/hirodora-v21-typescript.txt','typescript.txt'],['/workspace/hirodora-v21-check.txt','check-build.txt'],['/workspace/hirodora-v21-android-build.txt','android-build.txt'],['/workspace/hirodora-v21-apk/apk-assets-smoke.json','apk-assets-smoke.json'],['/workspace/hirodora-v21-production-webkit.json','webkit-offline-before-fix.json'],
])await copyFile(source,`${dir}/${dest}`);
if(!/pass 80\b/.test(await readFile(`${dir}/unit-tests.txt`,'utf8')))throw Error('Unit checks missing');
const shots='docs/screenshots/update-v21',capture=JSON.parse(await readFile(`${shots}/capture.json`,'utf8'));
if(capture.errors.length||capture.captures.length!==6||(await readdir(shots)).filter(f=>f.endsWith('.png')).length!==6)throw Error('Exactly six actual game captures required');
const before=JSON.parse(await readFile('/workspace/hirodora-v21-before/capture.json','utf8')).captures.find(c=>c.name==='04-right-hand-pistol'),after=capture.captures.find(c=>c.name==='03-pistol-grip');
for(const k of ['position','target','fov','item'])if(JSON.stringify(before[k])!==JSON.stringify(after[k]))throw Error('Grip camera mismatch');
const web=JSON.parse(await readFile('downloads/latest.json','utf8')),apk=JSON.parse(await readFile('downloads/android-latest.json','utf8'));
for(const [name,sha] of [[web.archive,web.sha256],[apk.file,apk.sha256]])if(hash(await readFile('downloads/'+name))!==sha)throw Error('Package hash mismatch');
if(apk.certificateSHA256!=='d7175da40c348c91e8a8663635d3a130115aba916e5ce889e40b646c009f33ca')throw Error('Signing identity changed');
await writeFile(`${dir}/zip-integrity.txt`,execFileSync('unzip',['-t','downloads/'+web.archive],{encoding:'utf8'}));
for (const file of (await readdir(dir)).filter(name => name.endsWith('.txt'))) {
  const content = await readFile(`${dir}/${file}`, 'utf8');
  await writeFile(`${dir}/${file}`, content.replace(/[ \t]+$/gm, '').trimEnd() + '\n');
}
const mobile=JSON.parse(await readFile('src/assets/environment/mobile-materials.json','utf8'));
await writeFile(`${dir}/report.json`,JSON.stringify({version:'0.21.0',unitPassed:80,chromiumSelectedPassed:17,webkitSelectedPassed:4,wholeBrowserSuiteRerun:false,runs,scenarios:[...cases].map(([name,status])=>({name,status})),captures:capture.captures,comparison:{camera:after.position,target:after.target,fov:after.fov,beforeStage:'Commit 9b6118f, before v21 implementation',beforeLocalPath:'/workspace/hirodora-v21-before/04-right-hand-pistol.png',beforeSHA256:hash(await readFile('/workspace/hirodora-v21-before/04-right-hand-pistol.png')),afterPath:`${shots}/03-pistol-grip.png`,afterSHA256:hash(await readFile(`${shots}/03-pistol-grip.png`))},mobileArchitecturalMaps:{desktopBytes:mobile.records.reduce((s,r)=>s+r.originalBytes,0),mobileBytes:mobile.records.reduce((s,r)=>s+r.bytes,0),estimatedRGBA8MipMiB:{desktop:64,mobile:16},physicalDeviceFPSMeasured:false},web,apk,knownLimits:['Public Pages URL returns 404; repository owner must enable Pages from GitHub Actions. Latest inspected Pages run 40676807758 reports Get Pages site failed / Not Found.','No physical iPhone or Android hardware performance/thermal certification.','No signed native IPA; macOS/Xcode and Apple signing are unavailable.'],testNotes:['Initial broad Chromium run overlapped source edits: reload/mobile refresh detachment and obsolete seven-stage assertion were rerun against stable DISABLE_HMR=true servers; latest outcomes above supersede them.','Retained initial WebKit production offline failure showed pending audio requests. Loading now waits for recordings; final production offline test passes.','The system ldconfig validator cannot see local browser libraries. Official Debian dependencies were installed in the browser bundle and validated through actual WebKit execution.']},null,2)+'\n');
console.log('Retained 80 unit checks, 17 Chromium cases, 4 WebKit cases, six captures and verified release hashes.');
