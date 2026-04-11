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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      campaign_donations: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string | null
          currency: string | null
          donor_email: string | null
          donor_name: string | null
          donor_phone: string | null
          id: string
          message: string | null
          status: string | null
          transaction_ref: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string | null
          currency?: string | null
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          id?: string
          message?: string | null
          status?: string | null
          transaction_ref?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string | null
          currency?: string | null
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          id?: string
          message?: string | null
          status?: string | null
          transaction_ref?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_images: {
        Row: {
          campaign_id: string
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
        }
        Insert: {
          campaign_id: string
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
        }
        Update: {
          campaign_id?: string
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_images_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          category: Database["public"]["Enums"]["fundraising_category"] | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          creator_id: string
          currency: string | null
          deadline: string | null
          id: string
          is_open_ended: boolean | null
          keywords: string[] | null
          main_image_url: string | null
          min_contribution: number | null
          phone_number: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_twitter: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          story_achieve: string | null
          story_for: string | null
          story_why: string | null
          summary: string | null
          target_amount: number | null
          title: string
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["fundraising_category"] | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          creator_id: string
          currency?: string | null
          deadline?: string | null
          id?: string
          is_open_ended?: boolean | null
          keywords?: string[] | null
          main_image_url?: string | null
          min_contribution?: number | null
          phone_number?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          story_achieve?: string | null
          story_for?: string | null
          story_why?: string | null
          summary?: string | null
          target_amount?: number | null
          title: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["fundraising_category"] | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          deadline?: string | null
          id?: string
          is_open_ended?: boolean | null
          keywords?: string[] | null
          main_image_url?: string | null
          min_contribution?: number | null
          phone_number?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          story_achieve?: string | null
          story_for?: string | null
          story_why?: string | null
          summary?: string | null
          target_amount?: number | null
          title?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      campuses: {
        Row: {
          campus_code: string | null
          campus_id: number
          campus_name: string
        }
        Insert: {
          campus_code?: string | null
          campus_id?: number
          campus_name: string
        }
        Update: {
          campus_code?: string | null
          campus_id?: number
          campus_name?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          allow_multiple_quantity: boolean | null
          amount: number
          auto_close: boolean | null
          banner_url: string | null
          campaign_category: string | null
          campaign_country: string | null
          campaign_keywords: string | null
          campaign_summary: string | null
          code_prefix: string | null
          collection_type: string | null
          contributions_fields: Json | null
          created_at: string | null
          currency: string
          currency_symbol: string
          deadline: string | null
          description: string | null
          event_date: string | null
          fee_bearer: string
          id: string
          is_open_ended: boolean | null
          max_contributions: number | null
          min_contribution: number | null
          price_tiers: Json | null
          rejection_reason: string | null
          slug: string | null
          social_links: Json | null
          status: string
          story: Json | null
          story_images: Json | null
          support_phone_number: string
          target_amount: number | null
          ticket_mode: string | null
          ticket_template_url: string | null
          title: string
          total_contributions: number
          type: string
          unique_id_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_multiple_quantity?: boolean | null
          amount?: number
          auto_close?: boolean | null
          banner_url?: string | null
          campaign_category?: string | null
          campaign_country?: string | null
          campaign_keywords?: string | null
          campaign_summary?: string | null
          code_prefix?: string | null
          collection_type?: string | null
          contributions_fields?: Json | null
          created_at?: string | null
          currency?: string
          currency_symbol?: string
          deadline?: string | null
          description?: string | null
          event_date?: string | null
          fee_bearer?: string
          id?: string
          is_open_ended?: boolean | null
          max_contributions?: number | null
          min_contribution?: number | null
          price_tiers?: Json | null
          rejection_reason?: string | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          story?: Json | null
          story_images?: Json | null
          support_phone_number: string
          target_amount?: number | null
          ticket_mode?: string | null
          ticket_template_url?: string | null
          title: string
          total_contributions?: number
          type?: string
          unique_id_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_multiple_quantity?: boolean | null
          amount?: number
          auto_close?: boolean | null
          banner_url?: string | null
          campaign_category?: string | null
          campaign_country?: string | null
          campaign_keywords?: string | null
          campaign_summary?: string | null
          code_prefix?: string | null
          collection_type?: string | null
          contributions_fields?: Json | null
          created_at?: string | null
          currency?: string
          currency_symbol?: string
          deadline?: string | null
          description?: string | null
          event_date?: string | null
          fee_bearer?: string
          id?: string
          is_open_ended?: boolean | null
          max_contributions?: number | null
          min_contribution?: number | null
          price_tiers?: Json | null
          rejection_reason?: string | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          story?: Json | null
          story_images?: Json | null
          support_phone_number?: string
          target_amount?: number | null
          ticket_mode?: string | null
          ticket_template_url?: string | null
          title?: string
          total_contributions?: number
          type?: string
          unique_id_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          check_in_status: string
          collection_id: string
          contributor_information: Json | null
          contributor_unique_code: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          payment_id: string | null
          phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          check_in_status?: string
          collection_id: string
          contributor_information?: Json | null
          contributor_unique_code?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          payment_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          check_in_status?: string
          collection_id?: string
          contributor_information?: Json | null
          contributor_unique_code?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          payment_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          access_code: string | null
          amount: number
          authorization_url: string | null
          channel: string | null
          collection_id: string | null
          contributor_confirmed_sent: boolean
          contributor_id: string | null
          created_at: string | null
          currency: string | null
          email: string
          full_name: string
          id: string
          init_email_sent: boolean
          net_amount: number
          organizer_notified_sent: boolean
          paid_at: string | null
          payment_reference: string
          phone_number: string | null
          settled_at: string | null
          settlement_status: string | null
          status: string
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          access_code?: string | null
          amount: number
          authorization_url?: string | null
          channel?: string | null
          collection_id?: string | null
          contributor_confirmed_sent?: boolean
          contributor_id?: string | null
          created_at?: string | null
          currency?: string | null
          email: string
          full_name: string
          id?: string
          init_email_sent?: boolean
          net_amount?: number
          organizer_notified_sent?: boolean
          paid_at?: string | null
          payment_reference: string
          phone_number?: string | null
          settled_at?: string | null
          settlement_status?: string | null
          status?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          access_code?: string | null
          amount?: number
          authorization_url?: string | null
          channel?: string | null
          collection_id?: string | null
          contributor_confirmed_sent?: boolean
          contributor_id?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string
          full_name?: string
          id?: string
          init_email_sent?: boolean
          net_amount?: number
          organizer_notified_sent?: boolean
          paid_at?: string | null
          payment_reference?: string
          phone_number?: string | null
          settled_at?: string | null
          settlement_status?: string | null
          status?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          document_type: string
          id: string
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
          verification_type: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: string
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
          verification_type: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: string
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
          verification_type?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      kyc_files: {
        Row: {
          document_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_at: string | null
        }
        Insert: {
          document_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          document_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kyc_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verification_history: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string | null
          old_status: string | null
          user_id: string
          verification_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          user_id: string
          verification_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          user_id?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verification_history_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "kyc_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          address_verified: boolean | null
          bank_verified: boolean | null
          bvn_verified: boolean | null
          completed_at: string | null
          id: string
          identity_verified: boolean | null
          nin_verified: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_verified?: boolean | null
          bank_verified?: boolean | null
          bvn_verified?: boolean | null
          completed_at?: string | null
          id?: string
          identity_verified?: boolean | null
          nin_verified?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_verified?: boolean | null
          bank_verified?: boolean | null
          bvn_verified?: boolean | null
          completed_at?: string | null
          id?: string
          identity_verified?: boolean | null
          nin_verified?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          account_last4: string | null
          account_name: string | null
          account_number_cipher: string | null
          bank_code: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          is_default: boolean
          provider: string
          recipient_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_last4?: string | null
          account_name?: string | null
          account_number_cipher?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean
          provider: string
          recipient_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_last4?: string | null
          account_name?: string | null
          account_number_cipher?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean
          provider?: string
          recipient_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          first_name: string
          full_name: string
          id: string
          is_organizer: boolean | null
          last_name: string
          phone_number: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          first_name: string
          full_name: string
          id: string
          is_organizer?: boolean | null
          last_name: string
          phone_number?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string
          full_name?: string
          id?: string
          is_organizer?: boolean | null
          last_name?: string
          phone_number?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          campus_id: number
          email: string | null
          first_name: string
          last_name: string
          other_campus: string | null
          phone_number: string
          student_id: number
        }
        Insert: {
          campus_id: number
          email?: string | null
          first_name: string
          last_name: string
          other_campus?: string | null
          phone_number: string
          student_id?: number
        }
        Update: {
          campus_id?: number
          email?: string | null
          first_name?: string
          last_name?: string
          other_campus?: string | null
          phone_number?: string
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["campus_id"]
          },
        ]
      }
      transfer_recipients: {
        Row: {
          account_name: string | null
          account_number: string
          bank_code: string
          created_at: string | null
          currency: string | null
          id: string
          recipient_code: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          bank_code: string
          created_at?: string | null
          currency?: string | null
          id?: string
          recipient_code: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          bank_code?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          recipient_code?: string
          user_id?: string
        }
        Relationships: []
      }
      user_identity: {
        Row: {
          bvn_cipher: string
          bvn_hash: string
          bvn_last4: string
          created_at: string | null
          id: string
          nin_cipher: string
          nin_hash: string
          nin_last4: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bvn_cipher: string
          bvn_hash: string
          bvn_last4: string
          created_at?: string | null
          id?: string
          nin_cipher: string
          nin_hash: string
          nin_last4: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bvn_cipher?: string
          bvn_hash?: string
          bvn_last4?: string
          created_at?: string | null
          id?: string
          nin_cipher?: string
          nin_hash?: string
          nin_last4?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          campaign_id: string
          document_name: string | null
          document_url: string
          id: string
          uploaded_at: string | null
        }
        Insert: {
          campaign_id: string
          document_name?: string | null
          document_url: string
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          campaign_id?: string
          document_name?: string | null
          document_url?: string
          id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_balance: number
          collection_id: string
          created_at: string | null
          currency: string
          currency_symbol: string
          fee_breakdown: Json | null
          gross_payment: number
          id: string
          ledger_balance: number
          net_payment: number
          pending_balance: number
          updated_at: string | null
          withdrawn: number
        }
        Insert: {
          available_balance?: number
          collection_id: string
          created_at?: string | null
          currency?: string
          currency_symbol?: string
          fee_breakdown?: Json | null
          gross_payment?: number
          id?: string
          ledger_balance?: number
          net_payment?: number
          pending_balance?: number
          updated_at?: string | null
          withdrawn?: number
        }
        Update: {
          available_balance?: number
          collection_id?: string
          created_at?: string | null
          currency?: string
          currency_symbol?: string
          fee_breakdown?: Json | null
          gross_payment?: number
          id?: string
          ledger_balance?: number
          net_payment?: number
          pending_balance?: number
          updated_at?: string | null
          withdrawn?: number
        }
        Relationships: [
          {
            foreignKeyName: "wallets_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: true
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          collection_id: string
          created_at: string | null
          destination_account: Json | null
          id: string
          paystack_recipient_code: string | null
          paystack_transfer_code: string | null
          status: string
          updated_at: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          collection_id: string
          created_at?: string | null
          destination_account?: Json | null
          id?: string
          paystack_recipient_code?: string | null
          paystack_transfer_code?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          collection_id?: string
          created_at?: string | null
          destination_account?: Json | null
          id?: string
          paystack_recipient_code?: string | null
          paystack_transfer_code?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_collection: {
        Args: { collection_id: string }
        Returns: undefined
      }
      get_pending_collections: {
        Args: never
        Returns: {
          id: string
          title: string
          status: string
          collection_type: string | null
          user_id: string
        }[]
      }
      process_deposit_settlements: { Args: never; Returns: undefined }
      reject_collection: {
        Args: { collection_id: string; reason: string }
        Returns: undefined
      }
      request_changes_collection: {
        Args: { collection_id: string; notes: string }
        Returns: undefined
      }
    }
    Enums: {
      campaign_status:
        | "draft"
        | "pending_verification"
        | "active"
        | "paused"
        | "completed"
        | "rejected"
        | "pending"
        | "closed"
      fundraising_category:
        | "Alumni"
        | "Charity"
        | "Community"
        | "Disaster"
        | "Education"
        | "Legal"
        | "Medical"
        | "Politics"
        | "Sports"
        | "Others"
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
      campaign_status: [
        "draft",
        "pending_verification",
        "active",
        "paused",
        "completed",
        "rejected",
        "pending",
        "closed",
      ],
      fundraising_category: [
        "Alumni",
        "Charity",
        "Community",
        "Disaster",
        "Education",
        "Legal",
        "Medical",
        "Politics",
        "Sports",
        "Others",
      ],
    },
  },
} as const
