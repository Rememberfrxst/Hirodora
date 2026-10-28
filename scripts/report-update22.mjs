import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='docs/verification/update-v22';await mkdir(dir,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputs=[
  ['chromium-initial.json','chromium','chromium'],
  ['chromium-focused.json','chromium-final','chromium'],
  ['chromium-meter-final.json','meter-final','chromium'],
  ['chromium-intro-release.json','intro-release','chromium'],
  ['webkit-initial.json','webkit','webkit'],
  ['webkit-focused.json','webkit-final','webkit'],
  ['webkit-touch-final.json','webkit-touch-final','webkit'],
  ['webkit-production-offline.json','production-webkit','webkit'],
];
const cases=new Map(),runs=[];
for(const [file,name,engine] of inputs){const path=`/workspace/hirodora-v22-${name}.json`,d=JSON.parse(await readFile(path,'utf8'));await copyFile(path,`${dir}/${file}`);runs.push({file,engine,stats:d.stats});
  const walk=s=>{for(const p of s.specs||[])for(const t of p.tests||[])cases.set(`${engine}: ${p.title}`,t.results.at(-1)?.status);for(const child of s.suites||[])walk(child);};d.suites.forEach(walk);
}
if(cases.size!==13||[...cases.values()].some(s=>s!=='passed'))throw Error('Incomplete selected checks '+JSON.stringify([...cases]));
for(const [source,dest] of [
  ['/workspace/hirodora-v22-check-final.txt','check-build.txt'],
  ['/workspace/hirodora-v22-android-build.txt','android-build.txt'],
  ['/workspace/hirodora-v22-apk/apk-assets-smoke.json','apk-assets-smoke.json'],
])await copyFile(source,`${dir}/${dest}`);
if(!/pass 83\b/.test(await readFile(`${dir}/check-build.txt`,'utf8')))throw Error('Unit checks missing');
const shots='docs/screenshots/update-v22',capture=JSON.parse(await readFile(`${shots}/capture.json`,'utf8'));
if(capture.errors.length||capture.captures.length!==6||(await readdir(shots)).filter(f=>f.endsWith('.png')).length!==6)throw Error('Exactly six actual game captures required');
const web=JSON.parse(await readFile('downloads/latest.json','utf8')),apk=JSON.parse(await readFile('downloads/android-latest.json','utf8'));
for(const [name,sha] of [[web.archive,web.sha256],[apk.file,apk.sha256]])if(hash(await readFile('downloads/'+name))!==sha)throw Error('Package hash mismatch');
const smoke=JSON.parse(await readFile(`${dir}/apk-assets-smoke.json`,'utf8'));
if(smoke.apkSHA256!==apk.sha256)throw Error('Stale APK payload smoke');
if(apk.certificateSHA256!=='d7175da40c348c91e8a8663635d3a130115aba916e5ce889e40b646c009f33ca')throw Error('Signing identity changed');
await writeFile(`${dir}/zip-integrity.txt`,execFileSync('unzip',['-t','downloads/'+web.archive],{encoding:'utf8'}));
for(const file of (await readdir(dir)).filter(n=>n.endsWith('.txt'))){const c=await readFile(`${dir}/${file}`,'utf8');await writeFile(`${dir}/${file}`,c.replace(/[ \t]+$/gm,'').trimEnd()+'\n');}
const voices=JSON.parse(await readFile('src/assets/audio/intro-voice-manifest.json','utf8'));
for(const v of voices.sources)if(hash(await readFile('src/assets/audio/'+v.file))!==v.sha256)throw Error('Voice hash mismatch');
await writeFile(`${dir}/report.json`,JSON.stringify({version:'0.22.0',unitPassed:83,chromiumSelectedPassed:10,webkitSelectedPassed:3,wholeBrowserSuiteRerun:false,runs,scenarios:[...cases].map(([name,status])=>({name,status})),captures:capture.captures,voices,web,apk,knownLimits:['No physical iPhone or Android performance/thermal certification.','Public iOS Pages hosting requires repository-owner configuration; prior URL returned 404. No native signed IPA.','Supplied ElevenLabs output rights depend on originating account permissions and terms; no CC0 claim.'],testNotes:['Initial quiet-chapter fixture did not re-aim when the table moved between held bursts; focused rerun tracks the object and passes.','Initial meter fixture did not sync key prerequisite state or retarget the moved table; final full-risk/investigation/cooling/progress checks pass.','Mobile fixture originally selected a non-existent Unbolt accessible label, then synthetic pointer capture; actual Interact pointer hold is now tested.','WebKit revealed duplicate white progress bars on touch; the product now shows a single shared bar. Final touch checks pass in both engines.','Intro run trajectory was checked against actual gate bounds and corrected before final build and screenshots.','Official browser libraries run locally; WebKit execution uses the bundle dependencies, not a physical Apple device.']},null,2)+'\n');
console.log('Retained 83 unit checks, 10 selected Chromium, 3 WebKit, six captures and matching signed release hashes.');
