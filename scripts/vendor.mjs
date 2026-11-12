import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
try{process.loadEnvFile(fileURLToPath(new URL('../.env.local',import.meta.url)))}catch(error){if(error.code!=='ENOENT')throw error}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(url||key){
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||''))throw Error('Use a Supabase URL and publishable key only; never a secret key.');
 await writeFile(new URL('../src/config.js',import.meta.url),'// Public configuration; authorization is enforced by Supabase Auth/RLS.\nconst TOEIC_CONFIG=Object.freeze('+JSON.stringify({supabaseUrl:url.replace(/\/$/,''),supabasePublishableKey:key},null,2)+');\n');
}
await mkdir(new URL('../src/vendor/',import.meta.url),{recursive:true});
await build({stdin:{contents:"export { createClient } from '@supabase/supabase-js';",resolveDir:root},outfile:fileURLToPath(new URL('../src/vendor/supabase.js',import.meta.url)),bundle:true,format:'iife',globalName:'SupabaseSDK',platform:'browser',target:'es2020',minify:true,legalComments:'eof'});
