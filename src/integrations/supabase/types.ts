export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_calendar_events: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      academic_calendar_rules: {
        Row: {
          created_at: string | null
          group_a_name: string
          group_b_name: string
          group_c_name: string
          group_d_name: string
          id: string
          is_exception: boolean | null
          start_date: string
          updated_at: string | null
          week1_group: string
          week2_group: string
          week3_group: string
          week4_group: string
        }
        Insert: {
          created_at?: string | null
          group_a_name?: string
          group_b_name?: string
          group_c_name?: string
          group_d_name?: string
          id?: string
          is_exception?: boolean | null
          start_date: string
          updated_at?: string | null
          week1_group: string
          week2_group: string
          week3_group: string
          week4_group: string
        }
        Update: {
          created_at?: string | null
          group_a_name?: string
          group_b_name?: string
          group_c_name?: string
          group_d_name?: string
          id?: string
          is_exception?: boolean | null
          start_date?: string
          updated_at?: string | null
          week1_group?: string
          week2_group?: string
          week3_group?: string
          week4_group?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          clinic_id: string
          created_at: string
          date: string
          end_time: string | null
          id: string
          notes: string | null
          patient_id: string
          patient_name: string | null
          specialty_id: string | null
          start_time: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          patient_name?: string | null
          specialty_id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          patient_name?: string | null
          specialty_id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "patient_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_companies: {
        Row: {
          address: string | null
          cnpj: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      classified_logs: {
        Row: {
          action: string
          classified_id: string
          created_at: string
          id: string
          notes: string | null
          performed_by: string | null
          timezone: string | null
        }
        Insert: {
          action: string
          classified_id: string
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          timezone?: string | null
        }
        Update: {
          action?: string
          classified_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classified_logs_classified_id_fkey"
            columns: ["classified_id"]
            isOneToOne: false
            referencedRelation: "classifieds"
            referencedColumns: ["id"]
          },
        ]
      }
      classifieds: {
        Row: {
          category: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string
          expires_at: string | null
          id: string
          location: string | null
          photo_1_url: string | null
          photo_2_url: string | null
          photo_3_url: string | null
          price: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expires_at?: string | null
          id?: string
          location?: string | null
          photo_1_url?: string | null
          photo_2_url?: string | null
          photo_3_url?: string | null
          price?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          location?: string | null
          photo_1_url?: string | null
          photo_2_url?: string | null
          photo_3_url?: string | null
          price?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinic_classes: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          specialty_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          specialty_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          specialty_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_classes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_classes_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "patient_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_triage_appointments: {
        Row: {
          created_at: string
          created_by: string | null
          duration_min: number | null
          end_time: string | null
          id: string
          notes: string | null
          patient_id: string
          patient_name: string | null
          scheduled_date: string
          start_time: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_min?: number | null
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          patient_name?: string | null
          scheduled_date: string
          start_time: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_min?: number | null
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          patient_name?: string | null
          scheduled_date?: string
          start_time?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clinics: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      course_history: {
        Row: {
          change_date: string
          change_type: string
          changed_by: string | null
          course_id: string
          created_at: string
          description: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          change_date?: string
          change_type: string
          changed_by?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          change_date?: string
          change_type?: string
          changed_by?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_history_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_leads: {
        Row: {
          course_id: string
          cpf: string | null
          created_at: string
          email: string
          id: string
          kommo_lead_id: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          cpf?: string | null
          created_at?: string
          email: string
          id?: string
          kommo_lead_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          kommo_lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_leads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_registrations: {
        Row: {
          completion_date: string | null
          course_id: string
          enrollment_date: string
          id: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completion_date?: string | null
          course_id: string
          enrollment_date?: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completion_date?: string | null
          course_id?: string
          enrollment_date?: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_validation_history: {
        Row: {
          change_date: string
          changed_by: string | null
          comments: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["validation_status"]
          previous_status:
            | Database["public"]["Enums"]["validation_status"]
            | null
          validation_id: string
        }
        Insert: {
          change_date?: string
          changed_by?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["validation_status"]
          previous_status?:
            | Database["public"]["Enums"]["validation_status"]
            | null
          validation_id: string
        }
        Update: {
          change_date?: string
          changed_by?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["validation_status"]
          previous_status?:
            | Database["public"]["Enums"]["validation_status"]
            | null
          validation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_validation_history_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "course_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_validations: {
        Row: {
          course_id: string
          created_at: string
          department_id: string
          id: string
          registration_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["validation_status"] | null
          submission_date: string
          submission_file_url: string | null
          submission_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          department_id: string
          id?: string
          registration_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          submission_date?: string
          submission_file_url?: string | null
          submission_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          department_id?: string
          id?: string
          registration_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          submission_date?: string
          submission_file_url?: string | null
          submission_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_validations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_validations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_validations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "course_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          accepts_students: boolean | null
          area: string
          banner_desktop_url: string | null
          banner_mobile_url: string | null
          billing_company_id: string | null
          class_count: number | null
          competitors: string | null
          course_materials: boolean | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency"]
          description: string
          differentials: string | null
          display_status: string | null
          duration: string | null
          effective_installment: string | null
          effective_repayment_type: string | null
          effective_repayment_value: string | null
          effective_start_date: string | null
          end_date: string | null
          id: string
          installment_suggestion: string | null
          investment: number
          is_archived: boolean | null
          language: Database["public"]["Enums"]["language"] | null
          materials_file_url: string | null
          modality: Database["public"]["Enums"]["course_modality"]
          nature: string | null
          observations: string | null
          other_professors: string | null
          periodicity: string | null
          photo_1_url: string
          photo_2_url: string | null
          photo_3_url: string | null
          photo_4_url: string | null
          pix_discount_enabled: boolean
          practical_workload: number | null
          prerequisites: string | null
          program: string | null
          project_file_url: string | null
          promotional_team_id: string | null
          required_equipment: string | null
          schedule_file_url: string | null
          selection_date: string | null
          slug: string | null
          status: Database["public"]["Enums"]["course_status"] | null
          suggested_repayment_type: string | null
          suggested_repayment_value: string | null
          suggested_start_date: string[] | null
          target_audience: Database["public"]["Enums"]["target_audience"]
          teacher_id: string | null
          theoretical_workload: number | null
          title: string
          updated_at: string
          vacancies: number
          workload: number
        }
        Insert: {
          accepts_students?: boolean | null
          area: string
          banner_desktop_url?: string | null
          banner_mobile_url?: string | null
          billing_company_id?: string | null
          class_count?: number | null
          competitors?: string | null
          course_materials?: boolean | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency"]
          description: string
          differentials?: string | null
          display_status?: string | null
          duration?: string | null
          effective_installment?: string | null
          effective_repayment_type?: string | null
          effective_repayment_value?: string | null
          effective_start_date?: string | null
          end_date?: string | null
          id?: string
          installment_suggestion?: string | null
          investment: number
          is_archived?: boolean | null
          language?: Database["public"]["Enums"]["language"] | null
          materials_file_url?: string | null
          modality: Database["public"]["Enums"]["course_modality"]
          nature?: string | null
          observations?: string | null
          other_professors?: string | null
          periodicity?: string | null
          photo_1_url: string
          photo_2_url?: string | null
          photo_3_url?: string | null
          photo_4_url?: string | null
          pix_discount_enabled?: boolean
          practical_workload?: number | null
          prerequisites?: string | null
          program?: string | null
          project_file_url?: string | null
          promotional_team_id?: string | null
          required_equipment?: string | null
          schedule_file_url?: string | null
          selection_date?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          suggested_repayment_type?: string | null
          suggested_repayment_value?: string | null
          suggested_start_date?: string[] | null
          target_audience: Database["public"]["Enums"]["target_audience"]
          teacher_id?: string | null
          theoretical_workload?: number | null
          title: string
          updated_at?: string
          vacancies: number
          workload: number
        }
        Update: {
          accepts_students?: boolean | null
          area?: string
          banner_desktop_url?: string | null
          banner_mobile_url?: string | null
          billing_company_id?: string | null
          class_count?: number | null
          competitors?: string | null
          course_materials?: boolean | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency"]
          description?: string
          differentials?: string | null
          display_status?: string | null
          duration?: string | null
          effective_installment?: string | null
          effective_repayment_type?: string | null
          effective_repayment_value?: string | null
          effective_start_date?: string | null
          end_date?: string | null
          id?: string
          installment_suggestion?: string | null
          investment?: number
          is_archived?: boolean | null
          language?: Database["public"]["Enums"]["language"] | null
          materials_file_url?: string | null
          modality?: Database["public"]["Enums"]["course_modality"]
          nature?: string | null
          observations?: string | null
          other_professors?: string | null
          periodicity?: string | null
          photo_1_url?: string
          photo_2_url?: string | null
          photo_3_url?: string | null
          photo_4_url?: string | null
          pix_discount_enabled?: boolean
          practical_workload?: number | null
          prerequisites?: string | null
          program?: string | null
          project_file_url?: string | null
          promotional_team_id?: string | null
          required_equipment?: string | null
          schedule_file_url?: string | null
          selection_date?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          suggested_repayment_type?: string | null
          suggested_repayment_value?: string | null
          suggested_start_date?: string[] | null
          target_audience?: Database["public"]["Enums"]["target_audience"]
          teacher_id?: string | null
          theoretical_workload?: number | null
          title?: string
          updated_at?: string
          vacancies?: number
          workload?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_billing_company_id_fkey"
            columns: ["billing_company_id"]
            isOneToOne: false
            referencedRelation: "billing_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_promotional_team_id_fkey"
            columns: ["promotional_team_id"]
            isOneToOne: false
            referencedRelation: "promotional_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          html_template: string
          id: string
          name: string
          subject: string
          text_template: string | null
          type: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string
          html_template: string
          id?: string
          name: string
          subject: string
          text_template?: string | null
          type: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string
          html_template?: string
          id?: string
          name?: string
          subject?: string
          text_template?: string | null
          type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      notification_groups: {
        Row: {
          created_at: string
          description: string | null
          emails: string[]
          id: string
          is_enabled: boolean | null
          name: string
          template_id: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emails?: string[]
          id?: string
          is_enabled?: boolean | null
          name: string
          template_id: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emails?: string[]
          id?: string
          is_enabled?: boolean | null
          name?: string
          template_id?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_groups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      old_contacts: {
        Row: {
          celular: string
          created_at: string
          creation_date: string | null
          id: string
          kommo_sent: boolean
          modified_date: string | null
          nome: string
        }
        Insert: {
          celular: string
          created_at?: string
          creation_date?: string | null
          id?: string
          kommo_sent?: boolean
          modified_date?: string | null
          nome: string
        }
        Update: {
          celular?: string
          created_at?: string
          creation_date?: string | null
          id?: string
          kommo_sent?: boolean
          modified_date?: string | null
          nome?: string
        }
        Relationships: []
      }
      patient_attachments: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          patient_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          patient_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          patient_id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      patient_leads: {
        Row: {
          birth_date: string
          city: string
          cpf: string | null
          created_at: string
          full_name: string
          gender: string
          id: string
          kommo_lead_id: string | null
          landline_phone: string | null
          message: string
          mobile_phone: string
          notes: string | null
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          birth_date: string
          city: string
          cpf?: string | null
          created_at?: string
          full_name: string
          gender: string
          id?: string
          kommo_lead_id?: string | null
          landline_phone?: string | null
          message: string
          mobile_phone: string
          notes?: string | null
          state: string
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string
          city?: string
          cpf?: string | null
          created_at?: string
          full_name?: string
          gender?: string
          id?: string
          kommo_lead_id?: string | null
          landline_phone?: string | null
          message?: string
          mobile_phone?: string
          notes?: string | null
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_notification_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_procedures: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          specialty_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          specialty_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          specialty_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_procedures_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "patient_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_specialties: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institution: string | null
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          assigned_class_id: string | null
          assigned_clinic_id: string | null
          assigned_specialty_id: string | null
          birth_date: string | null
          cap_status: Database["public"]["Enums"]["cap_status"] | null
          chk_dentaloffice: boolean | null
          chk_necessities: boolean | null
          chk_orientation: boolean | null
          chk_scheduled: boolean | null
          city: string | null
          cpf: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["workflow_stage"]
          dentist_status: Database["public"]["Enums"]["dentist_status"] | null
          email: string | null
          full_name: string
          gender: string | null
          has_exams: boolean | null
          id: string
          is_exam_return: boolean
          is_return: boolean | null
          kommo_lead_id: string | null
          medical_history: string | null
          mobile_phone: string | null
          no_show_count: number
          phone: string | null
          reception_status:
            | Database["public"]["Enums"]["reception_status"]
            | null
          scheduled_date: string | null
          specialties: string[] | null
          state: string | null
          treatment_needed: string | null
          treatment_types: string[] | null
          triaged_by_name: string | null
          updated_at: string
          urgency: string | null
          urgency_level: Database["public"]["Enums"]["urgency_level"] | null
        }
        Insert: {
          assigned_class_id?: string | null
          assigned_clinic_id?: string | null
          assigned_specialty_id?: string | null
          birth_date?: string | null
          cap_status?: Database["public"]["Enums"]["cap_status"] | null
          chk_dentaloffice?: boolean | null
          chk_necessities?: boolean | null
          chk_orientation?: boolean | null
          chk_scheduled?: boolean | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["workflow_stage"]
          dentist_status?: Database["public"]["Enums"]["dentist_status"] | null
          email?: string | null
          full_name: string
          gender?: string | null
          has_exams?: boolean | null
          id?: string
          is_exam_return?: boolean
          is_return?: boolean | null
          kommo_lead_id?: string | null
          medical_history?: string | null
          mobile_phone?: string | null
          no_show_count?: number
          phone?: string | null
          reception_status?:
            | Database["public"]["Enums"]["reception_status"]
            | null
          scheduled_date?: string | null
          specialties?: string[] | null
          state?: string | null
          treatment_needed?: string | null
          treatment_types?: string[] | null
          triaged_by_name?: string | null
          updated_at?: string
          urgency?: string | null
          urgency_level?: Database["public"]["Enums"]["urgency_level"] | null
        }
        Update: {
          assigned_class_id?: string | null
          assigned_clinic_id?: string | null
          assigned_specialty_id?: string | null
          birth_date?: string | null
          cap_status?: Database["public"]["Enums"]["cap_status"] | null
          chk_dentaloffice?: boolean | null
          chk_necessities?: boolean | null
          chk_orientation?: boolean | null
          chk_scheduled?: boolean | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["workflow_stage"]
          dentist_status?: Database["public"]["Enums"]["dentist_status"] | null
          email?: string | null
          full_name?: string
          gender?: string | null
          has_exams?: boolean | null
          id?: string
          is_exam_return?: boolean
          is_return?: boolean | null
          kommo_lead_id?: string | null
          medical_history?: string | null
          mobile_phone?: string | null
          no_show_count?: number
          phone?: string | null
          reception_status?:
            | Database["public"]["Enums"]["reception_status"]
            | null
          scheduled_date?: string | null
          specialties?: string[] | null
          state?: string | null
          treatment_needed?: string | null
          treatment_types?: string[] | null
          triaged_by_name?: string | null
          updated_at?: string
          urgency?: string | null
          urgency_level?: Database["public"]["Enums"]["urgency_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_assigned_class_id_fkey"
            columns: ["assigned_class_id"]
            isOneToOne: false
            referencedRelation: "clinic_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_assigned_clinic_id_fkey"
            columns: ["assigned_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_assigned_specialty_id_fkey"
            columns: ["assigned_specialty_id"]
            isOneToOne: false
            referencedRelation: "patient_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          cro: string | null
          date_bypass_until: string | null
          department_id: string | null
          email: string
          id: string
          name: string
          phone: string | null
          restrict_to_own_area: boolean
          triage_specialty_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          cro?: string | null
          date_bypass_until?: string | null
          department_id?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          restrict_to_own_area?: boolean
          triage_specialty_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          cro?: string | null
          date_bypass_until?: string | null
          department_id?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          restrict_to_own_area?: boolean
          triage_specialty_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_triage_specialty_id_fkey"
            columns: ["triage_specialty_id"]
            isOneToOne: false
            referencedRelation: "patient_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_teams: {
        Row: {
          contact_person: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_configuration: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          bio: string | null
          created_at: string
          cro: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          photo_url: string | null
          specialties: string[] | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          cro?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          photo_url?: string | null
          specialties?: string[] | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          cro?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          specialties?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      triage_appointments: {
        Row: {
          created_at: string
          created_by: string | null
          duration_min: number | null
          end_time: string | null
          id: string
          notes: string | null
          patient_id: string
          patient_name: string | null
          scheduled_date: string
          start_time: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_min?: number | null
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          patient_name?: string | null
          scheduled_date: string
          start_time: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_min?: number | null
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          patient_name?: string | null
          scheduled_date?: string
          start_time?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      exec_sql: { Args: { query: string }; Returns: Json }
      get_public_classifieds: {
        Args: never
        Returns: {
          category: string
          contact_name: string
          created_at: string
          description: string
          expires_at: string
          id: string
          location: string
          photo_1_url: string
          photo_2_url: string
          photo_3_url: string
          price: number
          title: string
        }[]
      }
      get_public_teachers: {
        Args: never
        Returns: {
          bio: string
          cro: string
          id: string
          is_active: boolean
          name: string
          photo_url: string
          specialties: string[]
        }[]
      }
      has_module_permission: {
        Args: { _action?: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_v2: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_staff: { Args: { _user_id: string }; Returns: boolean }
      is_course_owner: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_enrolled_in_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_triage_dentist: { Args: { _user_id: string }; Returns: boolean }
      is_triage_manager: { Args: { _user_id: string }; Returns: boolean }
      unaccent: { Args: { "": string }; Returns: string }
      user_is_area_restricted: { Args: { _user_id: string }; Returns: boolean }
      user_triage_specialty: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "student"
        | "triage_coordenador"
        | "triage_atendente"
        | "triage_dentista"
      cap_status:
        | "aguardando_vaga"
        | "em_negociacao"
        | "entrevista_agendada"
        | "faltou"
        | "declinado_falta"
      course_modality: "presencial" | "online" | "hibrido"
      course_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "archived"
      currency: "real" | "dolar"
      dentist_status:
        | "aguardando"
        | "em_atendimento"
        | "apto"
        | "inapto"
        | "em_observacao"
        | "agendado"
        | "consultou"
        | "faltou"
      language: "portuguese" | "english" | "spanish"
      reception_status:
        | "entrada"
        | "contato_realizado"
        | "faltou"
        | "nao_selecionado"
        | "aguardando_retorno"
      target_audience:
        | "cirurgioes_dentistas"
        | "tecnicos"
        | "auxiliares"
        | "estudantes"
        | "outros"
      urgency_level: "baixa" | "media" | "alta" | "emergencia"
      validation_status:
        | "pending_review"
        | "approved"
        | "pending_correction"
        | "rejected"
      workflow_stage:
        | "step1_atendimento"
        | "step2_triagem_clinica"
        | "step3_selecao_cap"
        | "em_atendimento"
        | "arquivado"
        | "em_negociacao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "staff",
        "student",
        "triage_coordenador",
        "triage_atendente",
        "triage_dentista",
      ],
      cap_status: [
        "aguardando_vaga",
        "em_negociacao",
        "entrevista_agendada",
        "faltou",
        "declinado_falta",
      ],
      course_modality: ["presencial", "online", "hibrido"],
      course_status: [
        "draft",
        "pending_approval",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
        "archived",
      ],
      currency: ["real", "dolar"],
      dentist_status: [
        "aguardando",
        "em_atendimento",
        "apto",
        "inapto",
        "em_observacao",
        "agendado",
        "consultou",
        "faltou",
      ],
      language: ["portuguese", "english", "spanish"],
      reception_status: [
        "entrada",
        "contato_realizado",
        "faltou",
        "nao_selecionado",
        "aguardando_retorno",
      ],
      target_audience: [
        "cirurgioes_dentistas",
        "tecnicos",
        "auxiliares",
        "estudantes",
        "outros",
      ],
      urgency_level: ["baixa", "media", "alta", "emergencia"],
      validation_status: [
        "pending_review",
        "approved",
        "pending_correction",
        "rejected",
      ],
      workflow_stage: [
        "step1_atendimento",
        "step2_triagem_clinica",
        "step3_selecao_cap",
        "em_atendimento",
        "arquivado",
        "em_negociacao",
      ],
    },
  },
} as const
