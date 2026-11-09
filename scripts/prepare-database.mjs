import {readdir,readFile,writeFile} from 'node:fs/promises';
const files=(await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
let sql="-- Borough installation for a NEW empty Supabase project. Run once in SQL Editor.\nBEGIN;\nCREATE SCHEMA IF NOT EXISTS supabase_migrations;\nCREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);\n";
for(const file of files){const source=await readFile(`supabase/migrations/${file}`,'utf8');const [version,...name]=file.replace('.sql','').split('_');sql+=`\n-- ${file}\n${source}\nINSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('${version}','${name.join('_')}',ARRAY[$migration$${source}$migration$]);\n`;}
sql+="COMMIT;\nNOTIFY pgrst, 'reload schema';\n";
await writeFile('supabase/INSTALL.sql',sql);console.log(`Prepared ${files.length} migrations in supabase/INSTALL.sql`);
