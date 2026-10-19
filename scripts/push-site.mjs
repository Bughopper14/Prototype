import {spawnSync} from 'node:child_process';
let raw='';for await(const c of process.stdin)raw+=c;
const input=raw?JSON.parse(raw):{};
const token=process.env.LOS_SITE_TOKEN||input.token;
const remote=process.env.LOS_SITE_REMOTE||input.remote;
const mode=process.env.LOS_SITE_MODE||input.mode||'verify';
if(!token||!remote)throw new Error('Missing Site source credential.');
const authorization=process.env.LOS_SITE_AUTH==='basic'?`Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`:`Bearer ${token}`;
const env={...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.extraheader',GIT_CONFIG_VALUE_0:`Authorization: ${authorization}`,GIT_TERMINAL_PROMPT:'0'};
const args=mode==='push'?['push',remote,'main:refs/heads/main']:['ls-remote','--heads',remote,'refs/heads/main'];
const r=spawnSync('git',args,{encoding:'utf8',env,windowsHide:true,timeout:15000});
if(r.status!==0){process.stderr.write(`Site source operation failed (exit ${r.status??'unknown'}). ${r.stderr.replaceAll(token,'[redacted]').split('\n').slice(-3).join('\n')}`);process.exit(r.status||1);}
process.stdout.write(r.stdout.trim());
