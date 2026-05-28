drop policy if exists "super admins can manage consultant client links"
    on public.consultant_restaurants;

create policy "super admins can manage consultant client links"
    on public.consultant_restaurants
    for all
    to authenticated
    using (public.is_super_admin())
    with check (public.is_super_admin());
