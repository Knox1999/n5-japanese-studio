import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'out');
const stage=resolve(root,'_e2e','n5-japanese-studio');

await rm(resolve(root,'_e2e'),{recursive:true,force:true});
await mkdir(stage,{recursive:true});
await cp(out,stage,{recursive:true});
console.log(`Staged static export at ${stage}`);
