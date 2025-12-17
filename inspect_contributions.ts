
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

async function checkStatuses() {
    const { data, error } = await supabase
        .from('contributions')
        .select('status')

    if (error) { console.error(error); return }

    // Count distinct
    const counts: Record<string, number> = {}
    data?.forEach((row: any) => {
        const s = row.status || 'null'
        counts[s] = (counts[s] || 0) + 1
    })

    console.log("Statuses:", counts)
}

checkStatuses()
