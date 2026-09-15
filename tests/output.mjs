import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
export const outputDir=process.env.TURF_TEST_OUTPUT||path.join(tmpdir(),'turf-club-tests');
await mkdir(outputDir,{recursive:true});
export const outputPath=name=>path.join(outputDir,name);
