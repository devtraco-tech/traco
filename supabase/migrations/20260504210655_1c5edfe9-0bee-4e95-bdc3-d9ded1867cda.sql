CREATE POLICY "Public can view teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Public can view promotional teams" ON public.promotional_teams FOR SELECT USING (true);