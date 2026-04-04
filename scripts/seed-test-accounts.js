// ⚠️  DELETE BEFORE PRODUCTION LAUNCH ⚠️
// This script creates test accounts for development only.
// Run with: node scripts/seed-test-accounts.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  console.error('Make sure your .env.local is configured and run with:')
  console.error('  node --env-file=.env.local scripts/seed-test-accounts.js')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const testAccounts = [
  {
    email: 'test1@parishapp.dev',
    password: 'TestParish123!',
    full_name: 'Thomas Test',
    vocation_state: 'married',
    is_verified_clergy: false,
  },
  {
    email: 'priest@parishapp.dev',
    password: 'TestParish123!',
    full_name: 'Father Michael Test',
    vocation_state: 'ordained',
    is_verified_clergy: true,
  },
]

async function seed() {
  console.log('Creating test accounts...\n')

  for (const account of testAccounts) {
    const { email, password, full_name, vocation_state, is_verified_clergy } = account

    // Create auth user (email_confirm: false bypasses email verification)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`⚠️  ${email} already exists — skipping`)
      } else {
        console.error(`✗ Failed to create ${email}:`, error.message)
      }
      continue
    }

    const userId = data.user.id

    // Update profile with full details
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        vocation_state,
        is_verified_clergy,
      })
      .eq('id', userId)

    if (profileError) {
      console.error(`  ✗ Failed to update profile for ${email}:`, profileError.message)
    } else {
      console.log(`✓ Created: ${email} (${full_name})`)
      console.log(`  Password: TestParish123!`)
      console.log(`  Vocation: ${vocation_state}`)
      if (is_verified_clergy) console.log(`  ✝️  Verified clergy`)
      console.log()
    }
  }

  console.log('Done. Test accounts ready.')
}

seed().catch(console.error)
