// Generated from the live schema (supabase gen types). Relationships trimmed.
// Regenerate with: npm run db:types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row<R> = { Row: R; Insert: Partial<R> & Record<string, unknown>; Update: Partial<R>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      users: Row<{
        id: string; email: string | null; display_name: string | null;
        avatar_url: string | null; created_at: string;
      }>;
      seasons: Row<{
        id: string; name: string; invite_code: string; admin_id: string;
        length_weeks: number; weigh_days: string[]; start_date: string;
        status: string; next_showcase_at: string; offer_params: Json; created_at: string;
      }>;
      season_members: Row<{
        id: string; season_id: string; user_id: string; status: string; is_admin: boolean;
        height_cm: number | null; age: number | null; sex: string | null;
        activity_factor: number | null; start_kg: number | null; target_kg: number | null;
        current_kg: number | null; daily_target_kcal: number | null; maintenance_kcal: number | null;
        streak_days: number; shield_inventory: number; suspicious: boolean;
        cheat_day_last: string | null; ai_avatar_url: string | null; cosmetics: Json; joined_at: string;
      }>;
      daily_logs: Row<{
        id: string; member_id: string; log_date: string;
        breakfast_kcal: number; lunch_kcal: number; dinner_kcal: number; snack_kcal: number;
        breakfast_photo: string | null; lunch_photo: string | null;
        dinner_photo: string | null; snack_photo: string | null;
        is_dessert_log: boolean; cheat_day: boolean; closed: boolean;
        created_at: string; updated_at: string;
      }>;
      ledger: Row<{
        id: string; member_id: string; season_id: string; type: string; amount: number;
        description: string | null; ref_type: string | null; ref_id: string | null; created_at: string;
      }>;
      weigh_ins: Row<{
        id: string; member_id: string; weigh_date: string; weight_kg: number;
        photo_path: string | null; expected_kg: number | null; reward_given: boolean;
        admin_rejected: boolean; suspicion: Json | null; created_at: string;
      }>;
      market_offers: Row<{
        id: string; season_id: string; type: string; title: string; subtitle: string | null;
        instrument_id: string | null; symbol: string | null; lock_hours: number | null;
        rate: number | null; is_trap: boolean; leverage: number | null; price_per_lot: number;
        stock: number | null; min_stake: number | null; rent_per_day: number | null;
        terms: Json; active: boolean; spawn_at: string; expires_at: string | null; created_at: string;
      }>;
      positions: Row<{
        id: string; member_id: string; season_id: string; offer_id: string | null; type: string;
        title: string | null; instrument_id: string | null; symbol: string | null; amount_klr: number;
        lots: number | null; leverage: number | null; entry_price: number | null; rate: number | null;
        rent_per_day: number | null; lock_end: string | null; list_end: string | null; status: string;
        closed_value: number | null; opened_at: string; closed_at: string | null;
      }>;
      casino_sessions: Row<{
        id: string; member_id: string; season_id: string; stake: number; hours: number;
        end_at: string; result_multiplier: number | null; payout: number | null; percentile: number | null;
        status: string; created_at: string; revealed_at: string | null;
      }>;
      shop_items: Row<{
        id: string; key: string; name: string; description: string | null; emoji: string | null;
        price: number; category: string; active: boolean; sort: number;
      }>;
      purchases: Row<{
        id: string; member_id: string; item_id: string; item_key: string; price: number;
        meta: Json; created_at: string;
      }>;
      dessert_bombs: Row<{
        id: string; season_id: string; attacker_member_id: string; target_member_id: string;
        deadline: string; status: string; created_at: string;
      }>;
      notifications: Row<{
        id: string; member_id: string; kind: string; title: string; body: string | null;
        data: Json; read: boolean; created_at: string;
      }>;
      push_subscriptions: Row<{
        id: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at: string;
      }>;
    };
    Views: {
      member_balances: { Row: { member_id: string | null; balance: number | null }; Relationships: [] };
    };
    Functions: {
      buy_offer: { Args: { p_member: string; p_offer: string; p_lots?: number; p_amount?: number; p_entry_price?: number }; Returns: string };
      sell_position: { Args: { p_member: string; p_position: string; p_value: number }; Returns: number };
      list_position: { Args: { p_member: string; p_position: string }; Returns: undefined };
      casino_sit: { Args: { p_member: string; p_stake: number; p_hours: number }; Returns: string };
      shop_purchase: { Args: { p_member: string; p_item_key: string; p_meta?: Json }; Returns: string };
      member_balance: { Args: { p_member: string }; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never;
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Insert: infer I } ? I : never;
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Update: infer U } ? U : never;
