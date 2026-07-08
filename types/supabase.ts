/**
 * Hand-written Database types for the tables in supabase/schema.sql.
 * (Small enough to maintain by hand; swap for `supabase gen types` if it grows.)
 */

// NOTE: rows must be `type`, not `interface` — interfaces lack implicit index
// signatures and fail supabase-js's `Record<string, unknown>` constraint.
export type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  campus: string;
  verified: boolean;
  avatar_color: string;
  avatar_image_url: string | null;
  bio: string | null;
  created_at: string;
};

export type PostRow = {
  id: string;
  type: "app" | "shop" | "thrift";
  author: string;
  title: string;
  description: string;
  upvotes: number;
  platform: "ios" | "web" | null;
  status: string | null;
  status_label: string | null;
  cta_label: string | null;
  cta_url: string | null;
  banner_color: string | null;
  testers_needed: number | null;
  boosted: boolean;
  tags: string[];
  price_cents: number | null;
  location_label: string | null;
  boost_expires_at: string | null;
  /** thrift only: listing auto-expiry (~21d); null for app/shop */
  expires_at: string | null;
  created_at: string;
};

/** ranked_posts view: posts + live boost/score (BOOST_CAP 10, 3-day window). */
export type RankedPostRow = PostRow & {
  boost: number;
  score: number;
};

export type ReviewRow = {
  id: string;
  post_id: string;
  author: string;
  body: string;
  created_at: string;
};

export type RequestStatus = "open" | "fulfilled" | "declined" | "expired";

export type RequestRow = {
  id: string;
  post_id: string;
  buyer_id: string;
  /** denormalized from posts.author */
  seller_id: string;
  status: RequestStatus;
  created_at: string;
  last_activity_at: string;
};

export type RequestMessageRow = {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/** request_id has no FK — a rating outlives its (ephemeral) request. */
export type SellerRatingRow = {
  id: string;
  request_id: string;
  rater_id: string | null;
  seller_id: string;
  stars: number;
  created_at: string;
};

export type KarmaLedgerRow = {
  id: string;
  /** karma recipient (post author) */
  user_id: string;
  /** acting user (auth.uid() of clicker); null on pre-auth rows */
  actor_id: string | null;
  action: string;
  points: number;
  source_post_id: string | null;
  verified: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "handle" | "display_name">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      posts: {
        Row: PostRow;
        Insert: Partial<PostRow> & Pick<PostRow, "type" | "author" | "title" | "description">;
        Update: Partial<PostRow>;
        Relationships: [];
      };
      karma_ledger: {
        Row: KarmaLedgerRow;
        Insert: Partial<KarmaLedgerRow> &
          Pick<KarmaLedgerRow, "user_id" | "action" | "points">;
        Update: Partial<KarmaLedgerRow>;
        Relationships: [];
      };
      reviews: {
        Row: ReviewRow;
        Insert: Partial<ReviewRow> & Pick<ReviewRow, "post_id" | "author" | "body">;
        Update: Partial<ReviewRow>;
        Relationships: [];
      };
      requests: {
        Row: RequestRow;
        Insert: Partial<RequestRow> & Pick<RequestRow, "post_id" | "buyer_id" | "seller_id">;
        Update: Partial<RequestRow>;
        Relationships: [];
      };
      request_messages: {
        Row: RequestMessageRow;
        Insert: Partial<RequestMessageRow> &
          Pick<RequestMessageRow, "request_id" | "sender_id" | "body">;
        Update: Partial<RequestMessageRow>;
        Relationships: [];
      };
      seller_ratings: {
        Row: SellerRatingRow;
        Insert: Partial<SellerRatingRow> &
          Pick<SellerRatingRow, "request_id" | "seller_id" | "stars">;
        Update: Partial<SellerRatingRow>;
        Relationships: [];
      };
    };
    Views: {
      ranked_posts: {
        Row: RankedPostRow;
        Relationships: [];
      };
    };
    Functions: {
      record_upvote: { Args: { p_post_id: string }; Returns: number };
      record_cta_click: { Args: { p_post_id: string }; Returns: undefined };
      record_review: { Args: { p_post_id: string; p_body: string }; Returns: undefined };
      update_profile_identity: {
        Args: {
          p_bio?: string | null;
          p_avatar_image_url?: string | null;
          p_update_bio?: boolean;
          p_update_avatar?: boolean;
        };
        Returns: undefined;
      };
      profile_reputation: { Args: { p_profile_id: string }; Returns: unknown };
      create_request: { Args: { p_post_id: string }; Returns: string };
      send_request_message: { Args: { p_request_id: string; p_body: string }; Returns: string };
      update_request_status: {
        Args: { p_request_id: string; p_status: string };
        Returns: undefined;
      };
      update_thrift_status: { Args: { p_post_id: string; p_status: string }; Returns: undefined };
      rate_seller: { Args: { p_request_id: string; p_stars: number }; Returns: undefined };
      seller_rating_summary: { Args: { p_seller_id: string }; Returns: unknown };
    };
    Enums: { post_type: "app" | "shop" | "thrift"; request_status: RequestStatus };
    CompositeTypes: Record<string, never>;
  };
}
