-- 1. Create a safe, non-recursive check for admin status
create or replace function public.is_admin()
returns boolean as $$
begin
  return (
    select (role = 'admin')
    from public.users
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Drop the recursive policies from public.users
drop policy if exists "Admins can read all users" on public.users;
drop policy if exists "Admins can insert users" on public.users;
drop policy if exists "Admins can update users" on public.users;
drop policy if exists "Admins can delete users" on public.users;

-- 3. Create fixed, non-recursive policies for public.users
create policy "Admins can read all users" on public.users
  for select using (is_admin());

create policy "Admins can insert users" on public.users
  for insert with check (is_admin());

create policy "Admins can update users" on public.users
  for update using (is_admin());

create policy "Admins can delete users" on public.users
  for delete using (is_admin());
