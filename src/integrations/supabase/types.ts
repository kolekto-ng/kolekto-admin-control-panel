export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      collections: {
        Row: {
          amount: number;
          code_prefix: string | null;
          contributions_fields: Json | null;
          created_at: string | null;
          currency: string;
          currency_symbol: string;
          deadline: string | null;
          description: string | null;
          fee_bearer: string;
          id: string;
          max_contributions: number | null;
          status: string;
          title: string;
          total_contributions: number;
          type: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount?: number;
          code_prefix?: string | null;
          contributions_fields?: Json | null;
          created_at?: string | null;
          currency?: string;
          currency_symbol?: string;
          deadline?: string | null;
          description?: string | null;
          fee_bearer?: string;
          id?: string;
          max_contributions?: number | null;
          status?: string;
          title: string;
          total_contributions?: number;
          type?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          code_prefix?: string | null;
          contributions_fields?: Json | null;
          created_at?: string | null;
          currency?: string;
          currency_symbol?: string;
          deadline?: string | null;
          description?: string | null;
          fee_bearer?: string;
          id?: string;
          max_contributions?: number | null;
          status?: string;
          title?: string;
          total_contributions?: number;
          type?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      collections_backup: {
        Row: {
          amount: number | null;
          amount_breakdown: Json | null;
          balance: number | null;
          code_prefix: string | null;
          contributions_fields: Json | null;
          created_at: string | null;
          currency: string | null;
          currency_symbol: string | null;
          deadline: string | null;
          description: string | null;
          fee_bearer: string | null;
          gross_payment: number | null;
          id: string | null;
          max_contributions: number | null;
          net_payment: number | null;
          status: string | null;
          title: string | null;
          total_contributions: number | null;
          total_fees: number | null;
          updated_at: string | null;
          user_id: string | null;
          withdrawn: number | null;
        };
        Insert: {
          amount?: number | null;
          amount_breakdown?: Json | null;
          balance?: number | null;
          code_prefix?: string | null;
          contributions_fields?: Json | null;
          created_at?: string | null;
          currency?: string | null;
          currency_symbol?: string | null;
          deadline?: string | null;
          description?: string | null;
          fee_bearer?: string | null;
          gross_payment?: number | null;
          id?: string | null;
          max_contributions?: number | null;
          net_payment?: number | null;
          status?: string | null;
          title?: string | null;
          total_contributions?: number | null;
          total_fees?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          withdrawn?: number | null;
        };
        Update: {
          amount?: number | null;
          amount_breakdown?: Json | null;
          balance?: number | null;
          code_prefix?: string | null;
          contributions_fields?: Json | null;
          created_at?: string | null;
          currency?: string | null;
          currency_symbol?: string | null;
          deadline?: string | null;
          description?: string | null;
          fee_bearer?: string | null;
          gross_payment?: number | null;
          id?: string | null;
          max_contributions?: number | null;
          net_payment?: number | null;
          status?: string | null;
          title?: string | null;
          total_contributions?: number | null;
          total_fees?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          withdrawn?: number | null;
        };
        Relationships: [];
      };
      contributions: {
        Row: {
          amount: number;
          collection_id: string;
          contributor_information: Json | null;
          contributor_unique_code: string | null;
          created_at: string | null;
          email: string;
          id: string;
          name: string;
          payment_id: string | null;
          phone: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          collection_id: string;
          contributor_information?: Json | null;
          contributor_unique_code?: string | null;
          created_at?: string | null;
          email: string;
          id?: string;
          name: string;
          payment_id?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          collection_id?: string;
          contributor_information?: Json | null;
          contributor_unique_code?: string | null;
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string;
          payment_id?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contributions_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          }
        ];
      };
      deposits: {
        Row: {
          access_code: string | null;
          amount: number;
          authorization_url: string | null;
          channel: string | null;
          collection_id: string | null;
          contributor_id: string | null;
          created_at: string | null;
          currency: string | null;
          email: string;
          full_name: string;
          id: string;
          paid_at: string | null;
          payment_reference: string;
          phone_number: string | null;
          status: string;
          updated_at: string | null;
          wallet_id: string | null;
        };
        Insert: {
          access_code?: string | null;
          amount: number;
          authorization_url?: string | null;
          channel?: string | null;
          collection_id?: string | null;
          contributor_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          email: string;
          full_name: string;
          id?: string;
          paid_at?: string | null;
          payment_reference: string;
          phone_number?: string | null;
          status?: string;
          updated_at?: string | null;
          wallet_id?: string | null;
        };
        Update: {
          access_code?: string | null;
          amount?: number;
          authorization_url?: string | null;
          channel?: string | null;
          collection_id?: string | null;
          contributor_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          paid_at?: string | null;
          payment_reference?: string;
          phone_number?: string | null;
          status?: string;
          updated_at?: string | null;
          wallet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_contributor_id_fkey";
            columns: ["contributor_id"];
            isOneToOne: false;
            referencedRelation: "contributions";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          is_organizer: boolean | null;
          phone_number: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          is_organizer?: boolean | null;
          phone_number?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_organizer?: boolean | null;
          phone_number?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      transfer_recipients: {
        Row: {
          account_name: string | null;
          account_number: string;
          bank_code: string;
          created_at: string | null;
          currency: string | null;
          id: string;
          recipient_code: string;
          user_id: string;
        };
        Insert: {
          account_name?: string | null;
          account_number: string;
          bank_code: string;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          recipient_code: string;
          user_id: string;
        };
        Update: {
          account_name?: string | null;
          account_number?: string;
          bank_code?: string;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          recipient_code?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          available_balance: number;
          collection_id: string;
          created_at: string | null;
          currency: string;
          currency_symbol: string;
          fee_breakdown: Json | null;
          gross_payment: number;
          id: string;
          ledger_balance: number;
          net_payment: number;
          updated_at: string | null;
          withdrawn: number;
        };
        Insert: {
          available_balance?: number;
          collection_id: string;
          created_at?: string | null;
          currency?: string;
          currency_symbol?: string;
          fee_breakdown?: Json | null;
          gross_payment?: number;
          id?: string;
          ledger_balance?: number;
          net_payment?: number;
          updated_at?: string | null;
          withdrawn?: number;
        };
        Update: {
          available_balance?: number;
          collection_id?: string;
          created_at?: string | null;
          currency?: string;
          currency_symbol?: string;
          fee_breakdown?: Json | null;
          gross_payment?: number;
          id?: string;
          ledger_balance?: number;
          net_payment?: number;
          updated_at?: string | null;
          withdrawn?: number;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          }
        ];
      };
      withdrawals: {
        Row: {
          amount: number;
          collection_id: string;
          created_at: string | null;
          destination_account: Json | null;
          id: string;
          paystack_recipient_code: string | null;
          paystack_transfer_code: string | null;
          status: string;
          updated_at: string | null;
          user_id: string;
          wallet_id: string;
        };
        Insert: {
          amount: number;
          collection_id: string;
          created_at?: string | null;
          destination_account?: Json | null;
          id?: string;
          paystack_recipient_code?: string | null;
          paystack_transfer_code?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id: string;
          wallet_id: string;
        };
        Update: {
          amount?: number;
          collection_id?: string;
          created_at?: string | null;
          destination_account?: Json | null;
          id?: string;
          paystack_recipient_code?: string | null;
          paystack_transfer_code?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "withdrawals_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawals_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
