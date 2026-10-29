
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
            "cuisines": {
                  Row: {
                    "id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"name": string
                  }
                  Update: {
                    "id"?: number,"name"?: string
                  }
                  Relationships: [

                  ]
                },"dietary_tags": {
                  Row: {
                    "id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"name": string
                  }
                  Update: {
                    "id"?: number,"name"?: string
                  }
                  Relationships: [

                  ]
                },"ingredient_aliases": {
                  Row: {
                    "alias": string,"created_at": string,"id": number,"ingredient_id": number,"normalized_alias": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"created_at"?: string,"id"?: number,"ingredient_id": number,"normalized_alias": string
                  }
                  Update: {
                    "alias"?: string,"created_at"?: string,"id"?: number,"ingredient_id"?: number,"normalized_alias"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredient_aliases_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    }
                  ]
                },"ingredients": {
                  Row: {
                    "created_at": string,"id": number,"name": string,"normalized_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: number,"name": string,"normalized_name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: number,"name"?: string,"normalized_name"?: string
                  }
                  Relationships: [

                  ]
                },"pantry_items": {
                  Row: {
                    "added_at": string,"expiry_date": string | null,"ingredient_id": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"expiry_date"?: string | null,"ingredient_id": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "added_at"?: string,"expiry_date"?: string | null,"ingredient_id"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pantry_items_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pantry_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"role"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"recipe_dietary_tags": {
                  Row: {
                    "recipe_id": number,"tag_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "recipe_id": number,"tag_id": number
                  }
                  Update: {
                    "recipe_id"?: number,"tag_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_dietary_tags_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_dietary_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "dietary_tags"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_ingredients": {
                  Row: {
                    "amount": string | null,"display_name": string | null,"ingredient_id": number,"recipe_id": number,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: string | null,"display_name"?: string | null,"ingredient_id": number,"recipe_id": number,"unit"?: string | null
                  }
                  Update: {
                    "amount"?: string | null,"display_name"?: string | null,"ingredient_id"?: number,"recipe_id"?: number,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_ingredients_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_steps": {
                  Row: {
                    "id": number,"instruction": string,"recipe_id": number,"step_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"instruction": string,"recipe_id": number,"step_number": number
                  }
                  Update: {
                    "id"?: number,"instruction"?: string,"recipe_id"?: number,"step_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_steps_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "attribution": string | null,"cooking_time_min": number,"created_at": string,"cuisine_id": number | null,"description": string | null,"id": number,"image_url": string | null,"is_published": boolean,"last_synced_at": string | null,"source": string | null,"source_id": string | null,"source_url": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attribution"?: string | null,"cooking_time_min": number,"created_at"?: string,"cuisine_id"?: number | null,"description"?: string | null,"id"?: number,"image_url"?: string | null,"is_published"?: boolean,"last_synced_at"?: string | null,"source"?: string | null,"source_id"?: string | null,"source_url"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "attribution"?: string | null,"cooking_time_min"?: number,"created_at"?: string,"cuisine_id"?: number | null,"description"?: string | null,"id"?: number,"image_url"?: string | null,"is_published"?: boolean,"last_synced_at"?: string | null,"source"?: string | null,"source_id"?: string | null,"source_url"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipes_cuisine_id_fkey"
      columns: ["cuisine_id"]
isOneToOne: false
      referencedRelation: "cuisines"
      referencedColumns: ["id"]
    }
                  ]
                },"substitutes": {
                  Row: {
                    "ingredient_id": number,"note": string | null,"substitute_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ingredient_id": number,"note"?: string | null,"substitute_id": number
                  }
                  Update: {
                    "ingredient_id"?: number,"note"?: string | null,"substitute_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "substitutes_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "substitutes_substitute_id_fkey"
      columns: ["substitute_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_ingredient":
{ Args: { "p_aliases"?: Json,"p_name": string,"p_normalized_name": string }; Returns: number
                           },
"create_recipe":
{ Args: { "p_recipe": Json }; Returns: number
                           },
"get_recommendations":
{ Args: { "p_almost_only"?: boolean,"p_cuisine_id"?: number,"p_diet_tag_id"?: number,"p_limit"?: number,"p_max_time"?: number,"p_min_score"?: number,"p_page"?: number,"p_warning_days"?: number }; Returns: {
              "almost_achievable": boolean,"cooking_time_min": number,"cuisine": string,"dietary_tags": (string)[],"expiring_count": number,"have_count": number,"image_url": string,"match_score": number,"missing_count": number,"missing_ingredients": Json,"recipe_id": number,"required_count": number,"title": string,"total_items": number
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"replace_pantry_items":
{ Args: { "p_items": Json }; Returns: {
              "added_at": string,
"expiry_date": string | null,
"ingredient_id": number,
"updated_at": string,
"user_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "pantry_items"
        isOneToOne: false
        isSetofReturn: true
      } },
"update_recipe":
{ Args: { "p_recipe": Json,"p_recipe_id": number }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
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

          }
        }
} as const
