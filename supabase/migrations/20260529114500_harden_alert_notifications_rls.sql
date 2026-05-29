drop policy if exists "restaurant owners can read alert rules" on public.alert_rules;
drop policy if exists "restaurant owners can insert alert rules" on public.alert_rules;
drop policy if exists "restaurant owners can update alert rules" on public.alert_rules;
drop policy if exists "restaurant owners can delete alert rules" on public.alert_rules;
drop policy if exists "authorized users can read alert rules" on public.alert_rules;
drop policy if exists "authorized users can insert alert rules" on public.alert_rules;
drop policy if exists "authorized users can update alert rules" on public.alert_rules;
drop policy if exists "authorized users can delete alert rules" on public.alert_rules;

drop policy if exists "restaurant owners can read alert notifications" on public.alert_notifications;
drop policy if exists "restaurant owners can insert alert notifications" on public.alert_notifications;
drop policy if exists "restaurant owners can update alert notifications" on public.alert_notifications;
drop policy if exists "restaurant owners can delete alert notifications" on public.alert_notifications;
drop policy if exists "authorized users can read alert notifications" on public.alert_notifications;
drop policy if exists "authorized users can insert alert notifications" on public.alert_notifications;
drop policy if exists "authorized users can update alert notifications" on public.alert_notifications;
drop policy if exists "authorized users can delete alert notifications" on public.alert_notifications;

create policy "authorized users can read alert rules"
    on public.alert_rules for select
    using (
        public.is_super_admin()
        or restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.consultant_restaurants cr
            where cr.restaurant_id = alert_rules.restaurant_id
              and cr.consultant_user_id = auth.uid()
              and cr.status = 'ACTIVE'
        )
    );

create policy "authorized users can insert alert rules"
    on public.alert_rules for insert
    with check (
        public.is_super_admin()
        or restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.consultant_restaurants cr
            where cr.restaurant_id = alert_rules.restaurant_id
              and cr.consultant_user_id = auth.uid()
              and cr.status = 'ACTIVE'
        )
    );

create policy "authorized users can update alert rules"
    on public.alert_rules for update
    using (
        public.is_super_admin()
        or restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.consultant_restaurants cr
            where cr.restaurant_id = alert_rules.restaurant_id
              and cr.consultant_user_id = auth.uid()
              and cr.status = 'ACTIVE'
        )
    )
    with check (
        public.is_super_admin()
        or restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.consultant_restaurants cr
            where cr.restaurant_id = alert_rules.restaurant_id
              and cr.consultant_user_id = auth.uid()
              and cr.status = 'ACTIVE'
        )
    );

create policy "authorized users can delete alert rules"
    on public.alert_rules for delete
    using (
        public.is_super_admin()
        or restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.consultant_restaurants cr
            where cr.restaurant_id = alert_rules.restaurant_id
              and cr.consultant_user_id = auth.uid()
              and cr.status = 'ACTIVE'
        )
    );

create policy "authorized users can read alert notifications"
    on public.alert_notifications for select
    using (
        public.is_super_admin()
        or restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.consultant_restaurants cr
            where cr.restaurant_id = alert_notifications.restaurant_id
              and cr.consultant_user_id = auth.uid()
              and cr.status = 'ACTIVE'
        )
    );

create policy "authorized users can insert alert notifications"
    on public.alert_notifications for insert
    with check (
        (
            public.is_super_admin()
            or restaurant_id in (
                select id from public.restaurants where owner_id = auth.uid()
            )
            or exists (
                select 1
                from public.consultant_restaurants cr
                where cr.restaurant_id = alert_notifications.restaurant_id
                  and cr.consultant_user_id = auth.uid()
                  and cr.status = 'ACTIVE'
            )
        )
        and (
            rule_id is null
            or exists (
                select 1
                from public.alert_rules ar
                where ar.id = alert_notifications.rule_id
                  and ar.restaurant_id = alert_notifications.restaurant_id
            )
        )
    );

create policy "authorized users can update alert notifications"
    on public.alert_notifications for update
    using (
        public.is_super_admin()
        or restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.consultant_restaurants cr
            where cr.restaurant_id = alert_notifications.restaurant_id
              and cr.consultant_user_id = auth.uid()
              and cr.status = 'ACTIVE'
        )
    )
    with check (
        (
            public.is_super_admin()
            or restaurant_id in (
                select id from public.restaurants where owner_id = auth.uid()
            )
            or exists (
                select 1
                from public.consultant_restaurants cr
                where cr.restaurant_id = alert_notifications.restaurant_id
                  and cr.consultant_user_id = auth.uid()
                  and cr.status = 'ACTIVE'
            )
        )
        and (
            rule_id is null
            or exists (
                select 1
                from public.alert_rules ar
                where ar.id = alert_notifications.rule_id
                  and ar.restaurant_id = alert_notifications.restaurant_id
            )
        )
    );

create policy "authorized users can delete alert notifications"
    on public.alert_notifications for delete
    using (
        public.is_super_admin()
        or restaurant_id in (
            select id from public.restaurants where owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.consultant_restaurants cr
            where cr.restaurant_id = alert_notifications.restaurant_id
              and cr.consultant_user_id = auth.uid()
              and cr.status = 'ACTIVE'
        )
    );
