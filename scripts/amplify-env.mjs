import {writeFileSync} from 'node:fs';
// Explicit allowlist: never copy arbitrary CI credentials to SSR artifacts.
const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_MAIN_URL','NEXT_PUBLIC_SUPABASE_BUCKET','NEXT_PUBLIC_GA_ID','SUPABASE_ROLE_KEY','OPENAI_API_KEY','RESEND_API_KEY','UPLOADTHING_TOKEN','AWS_S3_REGION','AWS_S3_BUCKET','BUYME_API_KEY'];
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
 if(!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}
writeFileSync('.env.production',names.filter(name=>process.env[name]).map(name=>`${name}=${JSON.stringify(process.env[name])}`).join('\n')+'\n',{mode:0o600});
console.log('SSR environment prepared (values are redacted).');
