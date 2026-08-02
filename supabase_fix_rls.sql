-- ═══════════════════════════════════════════════════════════════
-- FIX RLS POLICIES FOR profiles TABLE
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Hapus policies lama jika ada (agar bisa dibuat ulang)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

-- Pastikan RLS aktif
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa membaca profil sendiri
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: User bisa membuat profil sendiri
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: User bisa mengupdate profil sendiri
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
