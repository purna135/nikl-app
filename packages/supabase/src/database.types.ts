
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
            "audit_log": {
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
                    "created_at": string,"fee_paise": number,"going_solo": boolean,"hold_expires_at": string | null,"id": string,"idempotency_key": string,"occurrence_id": string,"squad_id": string | null,"status": Database["public"]['Enums']["booking_status"],"total_paise": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fee_paise"?: number,"going_solo"?: boolean,"hold_expires_at"?: string | null,"id"?: string,"idempotency_key": string,"occurrence_id": string,"squad_id"?: string | null,"status"?: Database["public"]['Enums']["booking_status"],"total_paise"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"fee_paise"?: number,"going_solo"?: boolean,"hold_expires_at"?: string | null,"id"?: string,"idempotency_key"?: string,"occurrence_id"?: string,"squad_id"?: string | null,"status"?: Database["public"]['Enums']["booking_status"],"total_paise"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_occurrence_id_fkey"
      columns: ["occurrence_id"]
isOneToOne: false
      referencedRelation: "event_occurrences"
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
                },"posts": {
                  Row: {
                    "author_id": string,"author_type": Database["public"]['Enums']["author_type"],"caption": string | null,"club_id": string | null,"created_at": string,"created_by": string | null,"event_id": string | null,"id": string,"kind": Database["public"]['Enums']["post_kind"],"moderation_status": Database["public"]['Enums']["moderation_status"],"updated_at": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"author_type": Database["public"]['Enums']["author_type"],"caption"?: string | null,"club_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"moderation_status"?: Database["public"]['Enums']["moderation_status"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "author_id"?: string,"author_type"?: Database["public"]['Enums']["author_type"],"caption"?: string | null,"club_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"moderation_status"?: Database["public"]['Enums']["moderation_status"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
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
                    "author_id": string,"author_type": Database["public"]['Enums']["author_type"],"created_at": string,"created_by": string | null,"event_id": string | null,"expires_at": string,"id": string,"kind": Database["public"]['Enums']["story_kind"],"media_url": string | null,"moderation_status": Database["public"]['Enums']["moderation_status"],"template": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"author_type": Database["public"]['Enums']["author_type"],"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"expires_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["story_kind"],"media_url"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"template"?: Json | null
                  }
                  Update: {
                    "author_id"?: string,"author_type"?: Database["public"]['Enums']["author_type"],"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"expires_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["story_kind"],"media_url"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"template"?: Json | null
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
                    "booking_id": string,"checked_in_at": string | null,"checked_in_by": string | null,"code": string,"created_at": string,"id": string,"occurrence_id": string,"qr_token": string | null,"status": Database["public"]['Enums']["ticket_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"checked_in_at"?: string | null,"checked_in_by"?: string | null,"code": string,"created_at"?: string,"id"?: string,"occurrence_id": string,"qr_token"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "booking_id"?: string,"checked_in_at"?: string | null,"checked_in_by"?: string | null,"code"?: string,"created_at"?: string,"id"?: string,"occurrence_id"?: string,"qr_token"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"],"updated_at"?: string,"user_id"?: string
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
                    "address": string | null,"area": string | null,"created_at": string,"google_place_id": string | null,"id": string,"location": unknown,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"area"?: string | null,"created_at"?: string,"google_place_id"?: string | null,"id"?: string,"location"?: unknown,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"area"?: string | null,"created_at"?: string,"google_place_id"?: string | null,"id"?: string,"location"?: unknown,"name"?: string,"updated_at"?: string
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
"club_is_live":
{ Args: { "club": string }; Returns: boolean
                           },
"create_club":
{ Args: { "p_area"?: string,"p_bio"?: string,"p_category": string,"p_handle": string,"p_kind"?: string,"p_name": string }; Returns: string
                           },
"create_event":
{ Args: { "p_capacity"?: number,"p_category": string,"p_club_id": string,"p_description"?: string,"p_ends_at"?: string,"p_poster_url"?: string,"p_publish"?: boolean,"p_repeat_weeks"?: number,"p_starts_at": string,"p_tags"?: (string)[],"p_tiers"?: Json,"p_title": string,"p_venue_address"?: string,"p_venue_area"?: string,"p_venue_id"?: string,"p_venue_name"?: string }; Returns: string
                           },
"event_visible":
{ Args: { "ev": string }; Returns: boolean
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
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_valid_category":
{ Args: { "c": string }; Returns: boolean
                           },
"occurrence_visible":
{ Args: { "occ": string }; Returns: boolean
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
      } }
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
