
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env manually
const envPath = path.resolve(process.cwd(), '.env')
let envContent = fs.readFileSync(envPath, 'utf8')
const env: any = {}
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
        env[key.trim()] = value.trim()
    }
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function getFullCollection() {
    const { data, error } = await supabase
        .from('collections')
        .select('*')
        .ilike('type', '%tier%')
        .limit(1)

    if (error) { console.error(error); return }

    if (data) {
        fs.writeFileSync('full_collection_debug.json', JSON.stringify(data, null, 2))
        console.log("Wrote full row to full_collection_debug.json")
    }
}

getFullCollection()
