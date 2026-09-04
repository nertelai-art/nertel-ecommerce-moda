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
      addresses: {
        Row: {
          city: string;
          country_code: string;
          created_at: string;
          customer_id: string;
          id: string;
          line1: string;
          line2: string | null;
          postal_code: string;
          recipient: string;
          region: string | null;
        };
        Insert: {
          city: string;
          country_code: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          line1: string;
          line2?: string | null;
          postal_code: string;
          recipient: string;
          region?: string | null;
        };
        Update: {
          city?: string;
          country_code?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          line1?: string;
          line2?: string | null;
          postal_code?: string;
          recipient?: string;
          region?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          category_id: string;
          product_id: string;
        };
        Insert: {
          category_id: string;
          product_id: string;
        };
        Update: {
          category_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          object_path: string;
          alt_text: string;
          sort_order: number;
          mime_type: string;
          byte_size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          object_path: string;
          alt_text: string;
          sort_order?: number;
          mime_type: string;
          byte_size: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          object_path?: string;
          alt_text?: string;
          sort_order?: number;
          mime_type?: string;
          byte_size?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          color: string;
          created_at: string;
          currency: string;
          id: string;
          is_active: boolean;
          price_minor: number;
          product_id: string;
          size: string;
          sku: string;
        };
        Insert: {
          color: string;
          created_at?: string;
          currency: string;
          id?: string;
          is_active?: boolean;
          price_minor: number;
          product_id: string;
          size: string;
          sku: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          price_minor?: number;
          product_id?: string;
          size?: string;
          sku?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          care_instructions: string;
          composition: string;
          created_at: string;
          description: string;
          id: string;
          name: string;
          slug: string;
          status: string;
        };
        Insert: {
          care_instructions?: string;
          composition?: string;
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          slug: string;
          status?: string;
        };
        Update: {
          care_instructions?: string;
          composition?: string;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_pending_order: {
        Args: {
          session_token: string;
          request_key: string;
          checkout_details: Json;
        };
        Returns: Json;
      };
      current_pending_order: {
        Args: { session_token: string };
        Returns: Json;
      };
      cancel_cart_reservation: {
        Args: { session_token: string };
        Returns: boolean;
      };
      adjust_inventory: {
        Args: {
          idempotency_key: string;
          movement_reason: string;
          quantity_change: number;
          target_location: string;
          target_variant: string;
        };
        Returns: number;
      };
      current_staff_permissions: { Args: never; Returns: string[] };
      create_catalog_product: {
        Args: {
          product_slug: string;
          product_name: string;
          product_description: string;
          variant_sku: string;
          variant_size: string;
          variant_color: string;
          variant_price_minor: number;
          inventory_location: string;
        };
        Returns: string;
      };
      create_catalog_variant: {
        Args: {
          target_product: string;
          variant_sku: string;
          variant_size: string;
          variant_color: string;
          variant_price_minor: number;
          inventory_location: string;
        };
        Returns: string;
      };
      update_catalog_variant: {
        Args: {
          target_id: string;
          new_sku: string;
          new_size: string;
          new_color: string;
          new_price_minor: number;
          new_is_active: boolean;
        };
        Returns: undefined;
      };
      create_catalog_category: {
        Args: { category_slug: string; category_name: string };
        Returns: string;
      };
      update_catalog_category: {
        Args: {
          target_id: string;
          new_slug: string;
          new_name: string;
          new_is_active: boolean;
        };
        Returns: undefined;
      };
      set_product_categories: {
        Args: { target_product: string; target_categories: string[] };
        Returns: undefined;
      };
      register_catalog_image: {
        Args: {
          target_product: string;
          new_object_path: string;
          new_alt_text: string;
          new_sort_order: number;
          new_mime_type: string;
          new_byte_size: number;
        };
        Returns: string;
      };
      queue_product_image_cleanup: {
        Args: { object_path: string };
        Returns: undefined;
      };
      update_catalog_image: {
        Args: {
          target_id: string;
          new_alt_text: string;
          new_sort_order: number;
        };
        Returns: undefined;
      };
      delete_catalog_image: { Args: { target_id: string }; Returns: string };
      quote_cart: { Args: { cart: Json }; Returns: Json };
      reserve_cart: {
        Args: { cart: Json; request_key: string; session_token: string };
        Returns: Json;
      };
      server_reserve_cart: {
        Args: {
          cart: Json;
          request_key: string;
          session_token: string;
          actor_id: string | null;
          rate_key: string;
        };
        Returns: Json;
      };
      server_quote_cart: { Args: { cart: Json }; Returns: Json };
      server_create_pending_order: {
        Args: {
          session_token: string;
          request_key: string;
          checkout_details: Json;
          actor_id: string | null;
          rate_key: string;
        };
        Returns: Json;
      };
      server_current_pending_order: {
        Args: { session_token: string; actor_id: string | null };
        Returns: Json;
      };
      server_cancel_cart_reservation: {
        Args: {
          session_token: string;
          actor_id: string | null;
          rate_key: string;
        };
        Returns: boolean;
      };
      staff_catalog: {
        Args: never;
        Returns: {
          id: string;
          slug: string;
          name: string;
          description: string;
          status: string;
        }[];
      };
      staff_catalog_variants: {
        Args: never;
        Returns: {
          id: string;
          product_id: string;
          sku: string;
          size: string;
          color: string;
          price_minor: number;
          currency: string;
          is_active: boolean;
        }[];
      };
      staff_categories: {
        Args: never;
        Returns: {
          id: string;
          slug: string;
          name: string;
          is_active: boolean;
        }[];
      };
      staff_product_categories: {
        Args: never;
        Returns: { product_id: string; category_id: string }[];
      };
      staff_catalog_images: {
        Args: never;
        Returns: {
          id: string;
          product_id: string;
          object_path: string;
          alt_text: string;
          sort_order: number;
          mime_type: string;
          byte_size: number;
        }[];
      };
      update_catalog_product: {
        Args: {
          target_id: string;
          new_slug: string;
          new_name: string;
          new_description: string;
          new_status: string;
        };
        Returns: undefined;
      };
      staff_inventory: {
        Args: never;
        Returns: {
          color: string;
          location_id: string;
          location_name: string;
          on_hand: number;
          product_id: string;
          product_image_id: string | null;
          product_name: string;
          product_slug: string;
          reserved: number;
          size: string;
          sku: string;
          variant_id: string;
        }[];
      };
      staff_orders: {
        Args: never;
        Returns: {
          id: string;
          status: string;
          email: string;
          shipping_address: Json;
          amount_minor: number;
          currency: string;
          payment_status: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
          items: Json;
        }[];
      };
      staff_customers: {
        Args: never;
        Returns: {
          email: string;
          display_name: string;
          latest_address: Json;
          is_registered: boolean;
          order_count: number;
          paid_order_count: number;
          pending_order_count: number;
          total_spent_minor: number;
          currency: string;
          first_order_at: string;
          last_order_at: string;
          orders: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
