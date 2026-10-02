const packages = ['next','@supabase/ssr','@supabase/supabase-js','react','react-dom'];
for (const name of packages) {
 const meta = await fetch(`https://registry.npmjs.org/${name}`).then(r=>r.json());
 console.log(name, name==='next' ? Object.keys(meta.versions).filter(v=>/^15\.\d+\.\d+$/.test(v)).slice(-3).join(',') : meta['dist-tags'].latest);
}
