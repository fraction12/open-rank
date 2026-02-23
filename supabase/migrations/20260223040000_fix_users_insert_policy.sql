-- Fix: users table was missing INSERT policy, causing silent upsert failures during OAuth callback.
-- Allow authenticated users (just completed OAuth) to insert their own profile record.
CREATE POLICY "Authenticated users can create profile" ON users
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
