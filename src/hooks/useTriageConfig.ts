import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Clinic = {
  id: string;
  name: string;
  is_active: boolean;
};

export type ClinicClass = {
  id: string;
  clinic_id?: string;
  specialty_id?: string;
  name: string;
  status: string;
  dentist_ids?: string[];
  is_active: boolean;
};

export type Appointment = {
  id: string;
  clinic_id: string;
  specialty_id?: string;
  patient_id?: string;
  patient_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'canceled' | 'no_show';
  notes?: string;
};

export type Specialty = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  institution?: string;
};

export type Procedure = {
  id: string;
  specialty_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export const useTriageConfig = () => {
  const queryClient = useQueryClient();

  // 1. Specialties
  const specialtiesQuery = useQuery({
    queryKey: ['triage-specialties'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("patient_specialties").select("*").order("name");
      if (error) throw error;
      return (data || []) as Specialty[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const addSpecialty = useMutation({
    mutationFn: async (spec: Partial<Specialty>) => {
      const { data, error } = await (supabase as any).from("patient_specialties").insert([spec]).select().single();
      if (error) throw error;
      return data as Specialty;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-specialties'] })
  });

  const updateSpecialty = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Specialty> }) => {
      const { data, error } = await (supabase as any).from("patient_specialties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Specialty;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-specialties'] })
  });

  const deleteSpecialty = useMutation({
    mutationFn: async (id: string) => {
      // delete dependent procedures first
      await (supabase as any).from("patient_procedures").delete().eq("specialty_id", id);
      const { error } = await (supabase as any).from("patient_specialties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-specialties'] });
      queryClient.invalidateQueries({ queryKey: ['triage-procedures'] });
    }
  });

  // 2. Procedures
  const proceduresQuery = useQuery({
    queryKey: ['triage-procedures'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("patient_procedures").select("*").order("name");
      if (error) throw error;
      return (data || []) as Procedure[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const addProcedure = useMutation({
    mutationFn: async (proc: Partial<Procedure>) => {
      const { data, error } = await (supabase as any).from("patient_procedures").insert([proc]).select().single();
      if (error) throw error;
      return data as Procedure;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-procedures'] })
  });

  const deleteProcedure = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("patient_procedures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-procedures'] })
  });

  // 3. Clinics
  const clinicsQuery = useQuery({
    queryKey: ['triage-clinics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clinics").select("*").order("name");
      if (error) throw error;
      return (data || []) as Clinic[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const addClinic = useMutation({
    mutationFn: async (clinic: Partial<Clinic>) => {
      const { data, error } = await (supabase as any).from("clinics").insert([clinic]).select().single();
      if (error) throw error;
      return data as Clinic;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-clinics'] })
  });

  const updateClinic = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Clinic> }) => {
      const { data, error } = await (supabase as any).from("clinics").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Clinic;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-clinics'] })
  });

  // 4. Classes (Turmas)
  const classesQuery = useQuery({
    queryKey: ['triage-clinic-classes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clinic_classes").select("*").order("name");
      if (error) throw error;
      return (data || []) as ClinicClass[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const addClass = useMutation({
    mutationFn: async (cls: Partial<ClinicClass>) => {
      const { data, error } = await (supabase as any).from("clinic_classes").insert([cls]).select().single();
      if (error) throw error;
      return data as ClinicClass;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-clinic-classes'] })
  });

  const updateClass = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<ClinicClass> }) => {
      const { data, error } = await (supabase as any).from("clinic_classes").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as ClinicClass;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-clinic-classes'] })
  });
  
  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("clinic_classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-clinic-classes'] })
  });

  // 6. Appointments
  const appointmentsQuery = useQuery({
    queryKey: ['triage-appointments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("appointments").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data || []) as Appointment[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes for appointments
  });

  const addAppointment = useMutation({
    mutationFn: async (apt: Partial<Appointment>) => {
      const { data, error } = await (supabase as any).from("appointments").insert([apt]).select().single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-appointments'] })
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Appointment> }) => {
      const { data, error } = await (supabase as any).from("appointments").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triage-appointments'] })
  });

  return {
    specialties: specialtiesQuery.data || [],
    procedures: proceduresQuery.data || [],
    clinics: clinicsQuery.data || [],
    classes: classesQuery.data || [],
    appointments: appointmentsQuery.data || [],
    isLoading: specialtiesQuery.isLoading || proceduresQuery.isLoading || clinicsQuery.isLoading || classesQuery.isLoading || appointmentsQuery.isLoading,
    
    addSpecialty,
    updateSpecialty,
    deleteSpecialty,
    addProcedure,
    deleteProcedure,
    
    addClinic,
    updateClinic,
    addClass,
    updateClass,
    deleteClass,
    
    addAppointment,
    updateAppointment
  };
};

