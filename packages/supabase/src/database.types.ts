
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"after": Json | null,"before": Json | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"badges": {
                  Row: {
                    "created_at": string,"description": string | null,"icon": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string | null,"id": string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"blocks": {
                  Row: {
                    "blocked_user_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_user_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "blocked_user_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_user_id_fkey"
      columns: ["blocked_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_items": {
                  Row: {
                    "booking_id": string,"created_at": string,"id": string,"qty": number,"tier_id": string,"unit_price_paise": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"created_at"?: string,"id"?: string,"qty": number,"tier_id": string,"unit_price_paise": number
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"id"?: string,"qty"?: number,"tier_id"?: string,"unit_price_paise"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_items_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_items_tier_id_fkey"
      columns: ["tier_id"]
isOneToOne: false
      referencedRelation: "ticket_tiers"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "confirmed_at": string | null,"created_at": string,"discount_paise": number,"fee_paise": number,"going_solo": boolean,"hold_expires_at": string | null,"id": string,"idempotency_key": string,"occurrence_id": string,"pay_token": string | null,"promo_code_id": string | null,"squad_id": string | null,"status": Database["public"]['Enums']["booking_status"],"subtotal_paise": number,"total_paise": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,"created_at"?: string,"discount_paise"?: number,"fee_paise"?: number,"going_solo"?: boolean,"hold_expires_at"?: string | null,"id"?: string,"idempotency_key": string,"occurrence_id": string,"pay_token"?: string | null,"promo_code_id"?: string | null,"squad_id"?: string | null,"status"?: Database["public"]['Enums']["booking_status"],"subtotal_paise"?: number,"total_paise"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "confirmed_at"?: string | null,"created_at"?: string,"discount_paise"?: number,"fee_paise"?: number,"going_solo"?: boolean,"hold_expires_at"?: string | null,"id"?: string,"idempotency_key"?: string,"occurrence_id"?: string,"pay_token"?: string | null,"promo_code_id"?: string | null,"squad_id"?: string | null,"status"?: Database["public"]['Enums']["booking_status"],"subtotal_paise"?: number,"total_paise"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_occurrence_id_fkey"
      columns: ["occurrence_id"]
isOneToOne: false
      referencedRelation: "event_occurrences"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_promo_code_id_fkey"
      columns: ["promo_code_id"]
isOneToOne: false
      referencedRelation: "promo_codes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"club_members": {
                  Row: {
                    "club_id": string,"created_at": string,"role": Database["public"]['Enums']["club_role"],"status": Database["public"]['Enums']["club_member_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": string,"created_at"?: string,"role"?: Database["public"]['Enums']["club_role"],"status"?: Database["public"]['Enums']["club_member_status"],"user_id": string
                  }
                  Update: {
                    "club_id"?: string,"created_at"?: string,"role"?: Database["public"]['Enums']["club_role"],"status"?: Database["public"]['Enums']["club_member_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_members_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"club_payout_settings": {
                  Row: {
                    "bank_last4": string | null,"club_id": string,"created_at": string,"razorpay_account_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bank_last4"?: string | null,"club_id": string,"created_at"?: string,"razorpay_account_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bank_last4"?: string | null,"club_id"?: string,"created_at"?: string,"razorpay_account_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_payout_settings_club_id_fkey"
      columns: ["club_id"]
isOneToOne: true
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"clubs": {
                  Row: {
                    "area": string | null,"bio": string | null,"category": string,"cover_url": string | null,"created_at": string,"created_by": string | null,"handle": string,"id": string,"kind": string | null,"kyc_status": Database["public"]['Enums']["kyc_status"],"location": unknown,"logo_url": string | null,"name": string,"rating_avg": number | null,"rating_count": number,"review_note": string | null,"review_status": Database["public"]['Enums']["club_review_status"],"reviewed_at": string | null,"reviewed_by": string | null,"updated_at": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "area"?: string | null,"bio"?: string | null,"category": string,"cover_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"handle": string,"id"?: string,"kind"?: string | null,"kyc_status"?: Database["public"]['Enums']["kyc_status"],"location"?: unknown,"logo_url"?: string | null,"name": string,"rating_avg"?: number | null,"rating_count"?: number,"review_note"?: string | null,"review_status"?: Database["public"]['Enums']["club_review_status"],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"updated_at"?: string,"verified"?: boolean
                  }
                  Update: {
                    "area"?: string | null,"bio"?: string | null,"category"?: string,"cover_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"handle"?: string,"id"?: string,"kind"?: string | null,"kyc_status"?: Database["public"]['Enums']["kyc_status"],"location"?: unknown,"logo_url"?: string | null,"name"?: string,"rating_avg"?: number | null,"rating_count"?: number,"review_note"?: string | null,"review_status"?: Database["public"]['Enums']["club_review_status"],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"updated_at"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "clubs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clubs_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"event_occurrences": {
                  Row: {
                    "capacity": number | null,"created_at": string,"ends_at": string | null,"event_id": string,"id": string,"seats_taken": number,"starts_at": string,"status": Database["public"]['Enums']["occurrence_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity"?: number | null,"created_at"?: string,"ends_at"?: string | null,"event_id": string,"id"?: string,"seats_taken"?: number,"starts_at": string,"status"?: Database["public"]['Enums']["occurrence_status"],"updated_at"?: string
                  }
                  Update: {
                    "capacity"?: number | null,"created_at"?: string,"ends_at"?: string | null,"event_id"?: string,"id"?: string,"seats_taken"?: number,"starts_at"?: string,"status"?: Database["public"]['Enums']["occurrence_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_occurrences_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "age_limit": number | null,"category": string,"club_id": string,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"poster_url": string | null,"published_at": string | null,"recurrence_rule": string | null,"refund_policy": string | null,"slug": string,"status": Database["public"]['Enums']["event_status"],"tags": (string)[],"title": string,"updated_at": string,"venue_id": string | null,"visibility": Database["public"]['Enums']["visibility"],"women_only": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "age_limit"?: number | null,"category": string,"club_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"poster_url"?: string | null,"published_at"?: string | null,"recurrence_rule"?: string | null,"refund_policy"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["event_status"],"tags"?: (string)[],"title": string,"updated_at"?: string,"venue_id"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"],"women_only"?: boolean
                  }
                  Update: {
                    "age_limit"?: number | null,"category"?: string,"club_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"poster_url"?: string | null,"published_at"?: string | null,"recurrence_rule"?: string | null,"refund_policy"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["event_status"],"tags"?: (string)[],"title"?: string,"updated_at"?: string,"venue_id"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"],"women_only"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"follower_id": string,"target_id": string,"target_type": Database["public"]['Enums']["follow_target"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"follower_id": string,"target_id": string,"target_type": Database["public"]['Enums']["follow_target"]
                  }
                  Update: {
                    "created_at"?: string,"follower_id"?: string,"target_id"?: string,"target_type"?: Database["public"]['Enums']["follow_target"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"likes": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"actor_type": Database["public"]['Enums']["author_type"] | null,"created_at": string,"data": NonNullable<Json>,"id": string,"push_sent_at": string | null,"read_at": string | null,"target_id": string | null,"target_type": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_type"?: Database["public"]['Enums']["author_type"] | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"push_sent_at"?: string | null,"read_at"?: string | null,"target_id"?: string | null,"target_type"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_type"?: Database["public"]['Enums']["author_type"] | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"push_sent_at"?: string | null,"read_at"?: string | null,"target_id"?: string | null,"target_type"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_events": {
                  Row: {
                    "event_id": string,"event_type": string,"received_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "event_id": string,"event_type": string,"received_at"?: string
                  }
                  Update: {
                    "event_id"?: string,"event_type"?: string,"received_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount_paise": number,"booking_id": string,"created_at": string,"id": string,"method": string | null,"provider": string,"provider_order_id": string | null,"provider_payment_id": string | null,"raw_webhook": Json | null,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"booking_id": string,"created_at"?: string,"id"?: string,"method"?: string | null,"provider"?: string,"provider_order_id"?: string | null,"provider_payment_id"?: string | null,"raw_webhook"?: Json | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_paise"?: number,"booking_id"?: string,"created_at"?: string,"id"?: string,"method"?: string | null,"provider"?: string,"provider_order_id"?: string | null,"provider_payment_id"?: string | null,"raw_webhook"?: Json | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"payouts": {
                  Row: {
                    "amount_paise": number,"club_id": string,"created_at": string,"id": string,"on_hold_until": string | null,"provider_transfer_id": string | null,"status": Database["public"]['Enums']["payout_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"club_id": string,"created_at"?: string,"id"?: string,"on_hold_until"?: string | null,"provider_transfer_id"?: string | null,"status"?: Database["public"]['Enums']["payout_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_paise"?: number,"club_id"?: string,"created_at"?: string,"id"?: string,"on_hold_until"?: string | null,"provider_transfer_id"?: string | null,"status"?: Database["public"]['Enums']["payout_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payouts_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_admins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_media": {
                  Row: {
                    "blurhash": string | null,"created_at": string,"height": number | null,"id": string,"moderation_labels": Json | null,"position": number,"post_id": string,"url": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "blurhash"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: string,"moderation_labels"?: Json | null,"position"?: number,"post_id": string,"url": string,"width"?: number | null
                  }
                  Update: {
                    "blurhash"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: string,"moderation_labels"?: Json | null,"position"?: number,"post_id"?: string,"url"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_media_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_tags": {
                  Row: {
                    "accepted": boolean,"created_at": string,"post_id": string,"tagged_user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted"?: boolean,"created_at"?: string,"post_id": string,"tagged_user_id": string
                  }
                  Update: {
                    "accepted"?: boolean,"created_at"?: string,"post_id"?: string,"tagged_user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_tags_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_tags_tagged_user_id_fkey"
      columns: ["tagged_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"poster_ai_usage": {
                  Row: {
                    "calls": number,"day": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calls"?: number,"day": string,"user_id": string
                  }
                  Update: {
                    "calls"?: number,"day"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "poster_ai_usage_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string,"author_type": Database["public"]['Enums']["author_type"],"caption": string | null,"club_id": string | null,"created_at": string,"created_by": string | null,"event_id": string | null,"id": string,"kind": Database["public"]['Enums']["post_kind"],"moderation_note": string | null,"moderation_status": Database["public"]['Enums']["moderation_status"],"updated_at": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"author_type": Database["public"]['Enums']["author_type"],"caption"?: string | null,"club_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"moderation_note"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "author_id"?: string,"author_type"?: Database["public"]['Enums']["author_type"],"caption"?: string | null,"club_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"moderation_note"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "area": string | null,"avatar_url": string | null,"bio": string | null,"created_at": string,"id": string,"interests": (string)[],"is_private": boolean,"name": string | null,"updated_at": string,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area"?: string | null,"avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"id": string,"interests"?: (string)[],"is_private"?: boolean,"name"?: string | null,"updated_at"?: string,"username"?: string | null
                  }
                  Update: {
                    "area"?: string | null,"avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"id"?: string,"interests"?: (string)[],"is_private"?: boolean,"name"?: string | null,"updated_at"?: string,"username"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles_private": {
                  Row: {
                    "created_at": string,"dob_year": number | null,"id": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dob_year"?: number | null,"id": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"dob_year"?: number | null,"id"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_private_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"promo_codes": {
                  Row: {
                    "active": boolean,"amount_off_paise": number | null,"club_id": string,"code": string,"created_at": string,"created_by": string | null,"event_id": string | null,"id": string,"max_uses": number | null,"percent_off": number | null,"updated_at": string,"used": number,"valid_from": string | null,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"amount_off_paise"?: number | null,"club_id": string,"code": string,"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"id"?: string,"max_uses"?: number | null,"percent_off"?: number | null,"updated_at"?: string,"used"?: number,"valid_from"?: string | null,"valid_until"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"amount_off_paise"?: number | null,"club_id"?: string,"code"?: string,"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"id"?: string,"max_uses"?: number | null,"percent_off"?: number | null,"updated_at"?: string,"used"?: number,"valid_from"?: string | null,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "promo_codes_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "promo_codes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "promo_codes_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"refunds": {
                  Row: {
                    "amount_paise": number,"created_at": string,"id": string,"payment_id": string,"provider_refund_id": string | null,"reason": string | null,"status": Database["public"]['Enums']["refund_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"created_at"?: string,"id"?: string,"payment_id": string,"provider_refund_id"?: string | null,"reason"?: string | null,"status"?: Database["public"]['Enums']["refund_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_paise"?: number,"created_at"?: string,"id"?: string,"payment_id"?: string,"provider_refund_id"?: string | null,"reason"?: string | null,"status"?: Database["public"]['Enums']["refund_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "refunds_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "action": string | null,"created_at": string,"details": string | null,"id": string,"reason": string,"reporter_id": string,"reviewed_by": string | null,"status": Database["public"]['Enums']["report_status"],"target_id": string,"target_type": Database["public"]['Enums']["report_target"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action"?: string | null,"created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reporter_id"?: string,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id": string,"target_type": Database["public"]['Enums']["report_target"],"updated_at"?: string
                  }
                  Update: {
                    "action"?: string | null,"created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id"?: string,"target_type"?: Database["public"]['Enums']["report_target"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saves": {
                  Row: {
                    "created_at": string,"event_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saves_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saves_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stories": {
                  Row: {
                    "author_id": string,"author_type": Database["public"]['Enums']["author_type"],"created_at": string,"created_by": string | null,"event_id": string | null,"expires_at": string,"id": string,"kind": Database["public"]['Enums']["story_kind"],"media_url": string | null,"moderation_note": string | null,"moderation_status": Database["public"]['Enums']["moderation_status"],"template": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"author_type": Database["public"]['Enums']["author_type"],"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"expires_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["story_kind"],"media_url"?: string | null,"moderation_note"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"template"?: Json | null
                  }
                  Update: {
                    "author_id"?: string,"author_type"?: Database["public"]['Enums']["author_type"],"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"expires_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["story_kind"],"media_url"?: string | null,"moderation_note"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"template"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stories_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"story_views": {
                  Row: {
                    "story_id": string,"user_id": string,"viewed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "story_id": string,"user_id": string,"viewed_at"?: string
                  }
                  Update: {
                    "story_id"?: string,"user_id"?: string,"viewed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_views_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "story_views_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ticket_tiers": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"occurrence_id": string,"position": number,"price_paise": number,"quantity": number | null,"sale_ends_at": string | null,"sale_starts_at": string | null,"seats_per_ticket": number,"sold": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"occurrence_id": string,"position"?: number,"price_paise": number,"quantity"?: number | null,"sale_ends_at"?: string | null,"sale_starts_at"?: string | null,"seats_per_ticket"?: number,"sold"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"occurrence_id"?: string,"position"?: number,"price_paise"?: number,"quantity"?: number | null,"sale_ends_at"?: string | null,"sale_starts_at"?: string | null,"seats_per_ticket"?: number,"sold"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ticket_tiers_occurrence_id_fkey"
      columns: ["occurrence_id"]
isOneToOne: false
      referencedRelation: "event_occurrences"
      referencedColumns: ["id"]
    }
                  ]
                },"tickets": {
                  Row: {
                    "admits": number,"booking_id": string,"checked_in_at": string | null,"checked_in_by": string | null,"code": string,"created_at": string,"id": string,"occurrence_id": string,"qr_token": string | null,"status": Database["public"]['Enums']["ticket_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admits"?: number,"booking_id": string,"checked_in_at"?: string | null,"checked_in_by"?: string | null,"code": string,"created_at"?: string,"id"?: string,"occurrence_id": string,"qr_token"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "admits"?: number,"booking_id"?: string,"checked_in_at"?: string | null,"checked_in_by"?: string | null,"code"?: string,"created_at"?: string,"id"?: string,"occurrence_id"?: string,"qr_token"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tickets_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tickets_checked_in_by_fkey"
      columns: ["checked_in_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tickets_occurrence_id_fkey"
      columns: ["occurrence_id"]
isOneToOne: false
      referencedRelation: "event_occurrences"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tickets_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_badges": {
                  Row: {
                    "badge_id": string,"earned_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge_id": string,"earned_at"?: string,"user_id": string
                  }
                  Update: {
                    "badge_id"?: string,"earned_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_badges_badge_id_fkey"
      columns: ["badge_id"]
isOneToOne: false
      referencedRelation: "badges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_badges_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"venues": {
                  Row: {
                    "address": string | null,"area": string | null,"created_at": string,"google_place_id": string | null,"id": string,"lat": number | null,"lng": number | null,"location": unknown,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"area"?: string | null,"created_at"?: string,"google_place_id"?: string | null,"id"?: string,"lat"?: never,"lng"?: never,"location"?: unknown,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"area"?: string | null,"created_at"?: string,"google_place_id"?: string | null,"id"?: string,"lat"?: never,"lng"?: never,"location"?: unknown,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"waitlist": {
                  Row: {
                    "created_at": string,"id": string,"notified_at": string | null,"occurrence_id": string,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"notified_at"?: string | null,"occurrence_id": string,"position": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"notified_at"?: string | null,"occurrence_id"?: string,"position"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "waitlist_occurrence_id_fkey"
      columns: ["occurrence_id"]
isOneToOne: false
      referencedRelation: "event_occurrences"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "waitlist_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "are_friends":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"blocked_with_me":
{ Args: { "other": string }; Returns: boolean
                           },
"booking_fee_paise":
{ Args: { "p_amount": number }; Returns: number
                           },
"booking_for_payment":
{ Args: { "p_token": string }; Returns: {
              "area": string,"booking_id": string,"category": string,"discount_paise": number,"event_slug": string,"event_title": string,"fee_paise": number,"hold_expires_at": string,"items": Json,"poster_url": string,"starts_at": string,"status": string,"subtotal_paise": number,"ticket_count": number,"total_paise": number,"venue_name": string
            }[]
                           },
"bump_poster_ai_usage":
{ Args: { "p_limit": number,"p_user_id": string }; Returns: boolean
                           },
"can_edit_post":
{ Args: { "p": string }; Returns: boolean
                           },
"can_manage_event":
{ Args: { "ev": string }; Returns: boolean
                           },
"can_manage_occurrence":
{ Args: { "occ": string }; Returns: boolean
                           },
"can_staff_occurrence":
{ Args: { "occ": string }; Returns: boolean
                           },
"cancel_hold":
{ Args: { "p_booking_id": string }; Returns: undefined
                           },
"claim_payment_event":
{ Args: { "p_event_id": string,"p_event_type": string }; Returns: boolean
                           },
"club_is_live":
{ Args: { "club": string }; Returns: boolean
                           },
"complete_profile":
{ Args: { "p_area": string,"p_dob_year": number,"p_interests": (string)[],"p_name": string,"p_username": string }; Returns: undefined
                           },
"confirm_booking":
{ Args: { "p_booking_id": string }; Returns: undefined
                           },
"create_club":
{ Args: { "p_area"?: string,"p_bio"?: string,"p_category": string,"p_handle": string,"p_kind"?: string,"p_name": string }; Returns: string
                           },
"create_club_post":
{ Args: { "p_caption"?: string,"p_club_id": string,"p_event_id"?: string,"p_media_paths"?: (string)[] }; Returns: string
                           },
"create_club_story":
{ Args: { "p_club_id": string,"p_event_id"?: string,"p_media_path"?: string }; Returns: string
                           },
"create_event":
{ Args: { "p_capacity"?: number,"p_category": string,"p_club_id": string,"p_description"?: string,"p_ends_at"?: string,"p_poster_url"?: string,"p_publish"?: boolean,"p_repeat_weeks"?: number,"p_starts_at": string,"p_tags"?: (string)[],"p_tiers"?: Json,"p_title": string,"p_venue_address"?: string,"p_venue_area"?: string,"p_venue_id"?: string,"p_venue_lat"?: number,"p_venue_lng"?: number,"p_venue_name"?: string }; Returns: string
                           },
"create_user_post":
{ Args: { "p_caption"?: string,"p_event_id"?: string,"p_media_paths": (string)[],"p_visibility"?: string }; Returns: string
                           },
"create_user_story":
{ Args: { "p_event_id": string,"p_media_path"?: string,"p_note"?: string }; Returns: string
                           },
"event_visible":
{ Args: { "ev": string }; Returns: boolean
                           },
"expire_holds":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"explore_events":
{ Args: { "p_from"?: string,"p_to"?: string }; Returns: {
              "area": string,"category": string,"club_handle": string,"club_name": string,"club_verified": boolean,"ends_at": string,"event_id": string,"going": number,"is_free": boolean,"lat": number,"lng": number,"min_price_paise": number,"more_dates": number,"occurrence_id": string,"poster_url": string,"slug": string,"spots_left": number,"starts_at": string,"tags": (string)[],"title": string,"venue_name": string
            }[]
                           },
"follower_count":
{ Args: { "p_target_id": string,"p_target_type": Database["public"]['Enums']["follow_target"] }; Returns: number
                           },
"following_count":
{ Args: { "p_user_id": string }; Returns: number
                           },
"hold_booking":
{ Args: { "p_idempotency_key"?: string,"p_items": Json,"p_occurrence_id": string,"p_promo_code"?: string }; Returns: {
              "booking_id": string,"discount_paise": number,"fee_paise": number,"hold_expires_at": string,"pay_token": string,"status": string,"subtotal_paise": number,"total_paise": number
            }[]
                           },
"home_feed":
{ Args: { "p_limit"?: number }; Returns: {
              "area": string,"author_type": string,"caption": string,"club_category": string,"club_handle": string,"club_id": string,"club_logo_url": string,"club_name": string,"club_verified": boolean,"created_at": string,"event_category": string,"event_id": string,"event_slug": string,"event_title": string,"following": boolean,"is_free": boolean,"kind": string,"like_count": number,"liked": boolean,"media_path": string,"min_price_paise": number,"mine": boolean,"post_id": string,"poster_url": string,"saved": boolean,"starts_at": string,"suggested": boolean,"under_review": boolean,"user_avatar_url": string,"user_id": string,"user_name": string,"user_username": string,"venue_name": string
            }[]
                           },
"i_follow":
{ Args: { "target": string }; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_club_admin":
{ Args: { "club": string }; Returns: boolean
                           },
"is_club_owner":
{ Args: { "club": string }; Returns: boolean
                           },
"is_club_staff":
{ Args: { "club": string }; Returns: boolean
                           },
"is_follower":
{ Args: { "follower": string,"target_user": string }; Returns: boolean
                           },
"is_my_friend":
{ Args: { "other": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_valid_category":
{ Args: { "c": string }; Returns: boolean
                           },
"like_count":
{ Args: { "p_post_id": string }; Returns: number
                           },
"mark_stories_seen":
{ Args: { "p_story_ids": (string)[] }; Returns: undefined
                           },
"moderate_content":
{ Args: { "p_decision": Database["public"]['Enums']["moderation_status"],"p_note"?: string,"p_target_id": string,"p_target_type": string }; Returns: (string)[]
                           },
"moderation_default":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["moderation_status"]
                           },
"moderation_queue":
{ Args: Record<PropertyKey, never>; Returns: {
              "author_handle": string,"author_id": string,"author_name": string,"author_type": string,"caption": string,"created_at": string,"event_title": string,"media_paths": (string)[],"reasons": (string)[],"report_count": number,"status": string,"target_id": string,"target_type": string
            }[]
                           },
"my_bookings":
{ Args: Record<PropertyKey, never>; Returns: {
              "area": string,"booking_id": string,"category": string,"club_name": string,"created_at": string,"ends_at": string,"event_id": string,"event_slug": string,"event_title": string,"hold_expires_at": string,"items": Json,"pay_token": string,"poster_url": string,"starts_at": string,"status": string,"tickets": Json,"total_paise": number,"venue_name": string
            }[]
                           },
"occurrence_visible":
{ Args: { "occ": string }; Returns: boolean
                           },
"open_order_for":
{ Args: { "p_token": string }; Returns: string
                           },
"open_reports":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"details": string,"reason": string,"report_id": string,"reporter": string,"target_id": string,"target_label": string,"target_type": string
            }[]
                           },
"payment_captured":
{ Args: { "p_amount": number,"p_method": string,"p_order_id": string,"p_payment_id": string,"p_raw"?: Json }; Returns: string
                           },
"payment_failed":
{ Args: { "p_order_id": string,"p_payment_id": string,"p_raw"?: Json }; Returns: string
                           },
"price_selection":
{ Args: { "p_items": Json,"p_occurrence_id": string,"p_promo_code": string,"p_user_id": string }; Returns: {
              "discount_paise": number,"fee_paise": number,"promo_code_id": string,"seats": number,"subtotal_paise": number,"tickets": number,"total_paise": number
            }[]
                           },
"quote_booking":
{ Args: { "p_items": Json,"p_occurrence_id": string,"p_promo_code"?: string }; Returns: {
              "discount_paise": number,"fee_paise": number,"subtotal_paise": number,"total_paise": number
            }[]
                           },
"release_booking":
{ Args: { "p_booking_id": string,"p_status": Database["public"]['Enums']["booking_status"] }; Returns: undefined
                           },
"report_content":
{ Args: { "p_details"?: string,"p_reason": string,"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: undefined
                           },
"resolve_report":
{ Args: { "p_note"?: string,"p_report_id": string,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"review_club":
{ Args: { "p_club_id": string,"p_decision": Database["public"]['Enums']["club_review_status"],"p_note"?: string }; Returns: {
              "area": string | null,
"bio": string | null,
"category": string,
"cover_url": string | null,
"created_at": string,
"created_by": string | null,
"handle": string,
"id": string,
"kind": string | null,
"kyc_status": Database["public"]['Enums']["kyc_status"],
"location": unknown,
"logo_url": string | null,
"name": string,
"rating_avg": number | null,
"rating_count": number,
"review_note": string | null,
"review_status": Database["public"]['Enums']["club_review_status"],
"reviewed_at": string | null,
"reviewed_by": string | null,
"updated_at": string,
"verified": boolean
            }
                          SetofOptions: {
        from: "*"
        to: "clubs"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_block":
{ Args: { "p_on": boolean,"p_user_id": string }; Returns: undefined
                           },
"set_event_pin":
{ Args: { "p_event_id": string,"p_lat"?: number,"p_lng"?: number }; Returns: undefined
                           },
"set_follow_club":
{ Args: { "p_club_id": string,"p_on": boolean }; Returns: undefined
                           },
"set_follow_user":
{ Args: { "p_on": boolean,"p_user_id": string }; Returns: undefined
                           },
"set_like":
{ Args: { "p_on": boolean,"p_post_id": string }; Returns: undefined
                           },
"set_moderation_mode":
{ Args: { "p_mode": string }; Returns: undefined
                           },
"set_save":
{ Args: { "p_event_id": string,"p_on": boolean }; Returns: undefined
                           },
"start_payment":
{ Args: { "p_order_id": string,"p_provider": string,"p_token": string }; Returns: {
              "amount_paise": number,"booking_id": string
            }[]
                           },
"story_feed":
{ Args: Record<PropertyKey, never>; Returns: {
              "area": string,"author_avatar_url": string,"author_category": string,"author_handle": string,"author_id": string,"author_name": string,"author_type": string,"author_verified": boolean,"created_at": string,"event_category": string,"event_id": string,"event_slug": string,"event_title": string,"expires_at": string,"following": boolean,"is_free": boolean,"kind": string,"media_path": string,"min_price_paise": number,"mine": boolean,"poster_url": string,"seen": boolean,"starts_at": string,"story_id": string,"template": Json,"under_review": boolean
            }[]
                           },
"suggested_clubs":
{ Args: { "p_limit"?: number }; Returns: {
              "area": string,"category": string,"club_id": string,"followers": number,"handle": string,"kind": string,"logo_url": string,"name": string,"verified": boolean
            }[]
                           },
"ticket_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"user_profile":
{ Args: { "p_username": string }; Returns: {
              "area": string,"avatar_url": string,"bio": string,"blocked_by_me": boolean,"followers": number,"following": number,"follows_me": boolean,"i_follow": boolean,"is_me": boolean,"name": string,"user_id": string,"username": string
            }[]
                           },
"valid_media_path":
{ Args: { "owner": string,"path": string }; Returns: boolean
                           }
          }
          Enums: {
            "author_type": "club"|"user","booking_status": "held"|"payment_pending"|"failed"|"paid"|"confirmed"|"expired"|"late_paid"|"cancel_requested"|"refunded"|"checked_in","club_member_status": "invited"|"active"|"removed","club_review_status": "pending"|"approved"|"rejected"|"suspended","club_role": "owner"|"admin"|"checkin","event_status": "draft"|"published"|"cancelled"|"ended","follow_target": "club"|"user","kyc_status": "not_started"|"pending"|"verified"|"rejected","moderation_status": "pending"|"approved"|"rejected"|"flagged","occurrence_status": "scheduled"|"cancelled"|"ended","payment_status": "created"|"authorized"|"captured"|"failed"|"refunded"|"partially_refunded","payout_status": "pending"|"on_hold"|"processed"|"reversed"|"failed","post_kind": "photo"|"event"|"going","refund_status": "pending"|"processed"|"failed","report_status": "open"|"reviewing"|"actioned"|"dismissed","report_target": "post"|"story"|"user"|"club"|"event","story_kind": "event_auto"|"custom"|"your_plan","ticket_status": "valid"|"used"|"void","visibility": "public"|"friends"|"unlisted"|"private"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "author_type": ["club", "user"],"booking_status": ["held", "payment_pending", "failed", "paid", "confirmed", "expired", "late_paid", "cancel_requested", "refunded", "checked_in"],"club_member_status": ["invited", "active", "removed"],"club_review_status": ["pending", "approved", "rejected", "suspended"],"club_role": ["owner", "admin", "checkin"],"event_status": ["draft", "published", "cancelled", "ended"],"follow_target": ["club", "user"],"kyc_status": ["not_started", "pending", "verified", "rejected"],"moderation_status": ["pending", "approved", "rejected", "flagged"],"occurrence_status": ["scheduled", "cancelled", "ended"],"payment_status": ["created", "authorized", "captured", "failed", "refunded", "partially_refunded"],"payout_status": ["pending", "on_hold", "processed", "reversed", "failed"],"post_kind": ["photo", "event", "going"],"refund_status": ["pending", "processed", "failed"],"report_status": ["open", "reviewing", "actioned", "dismissed"],"report_target": ["post", "story", "user", "club", "event"],"story_kind": ["event_auto", "custom", "your_plan"],"ticket_status": ["valid", "used", "void"],"visibility": ["public", "friends", "unlisted", "private"]
          }
        }
} as const
