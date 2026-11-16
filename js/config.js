// Accounts and sync.
//
// Leave both values empty and Carver works as before: everything stays on this
// phone and the Account section is hidden.
//
// To turn on sign-in, syncing between devices and the shared food database:
// create a free Supabase project, run supabase/schema.sql in its SQL Editor,
// then paste the two values from Project Settings → API here.
// (The anon key is meant to be public; the database rules protect each account.)
export const CONFIG = {
  SUPABASE_URL: 'https://hfayaseunuyfxlyebwzc.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_9xD49-BiQJQR5jVa0DISrw_nxnA62zL',
  // Phone notifications (Web Push). The public half of the key pair; the private
  // half is a secret in Supabase (Edge Functions → Secrets → VAPID_PRIVATE_KEY).
  VAPID_PUBLIC_KEY: 'BBqKlCFu6kHUTpqMy9i5SP1NGm5xXw0MjFXtEh7fDdKP2to8S7s14I7qfzbTF7B2hSw8LFKEwypKKdilD-eN3HI',
};
