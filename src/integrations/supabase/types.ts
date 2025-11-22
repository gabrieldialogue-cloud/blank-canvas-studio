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
      atendimentos: {
        Row: {
          ano_veiculo: string | null
          chassi: string | null
          cliente_id: string | null
          created_at: string | null
          fotos_urls: string[] | null
          id: string
          marca_veiculo: string
          modelo_veiculo: string | null
          placa: string | null
          resumo_necessidade: string | null
          status: Database["public"]["Enums"]["atendimento_status"] | null
          updated_at: string | null
          vendedor_fixo_id: string | null
        }
        Insert: {
          ano_veiculo?: string | null
          chassi?: string | null
          cliente_id?: string | null
          created_at?: string | null
          fotos_urls?: string[] | null
          id?: string
          marca_veiculo: string
          modelo_veiculo?: string | null
          placa?: string | null
          resumo_necessidade?: string | null
          status?: Database["public"]["Enums"]["atendimento_status"] | null
          updated_at?: string | null
          vendedor_fixo_id?: string | null
        }
        Update: {
          ano_veiculo?: string | null
          chassi?: string | null
          cliente_id?: string | null
          created_at?: string | null
          fotos_urls?: string[] | null
          id?: string
          marca_veiculo?: string
          modelo_veiculo?: string | null
          placa?: string | null
          resumo_necessidade?: string | null
          status?: Database["public"]["Enums"]["atendimento_status"] | null
          updated_at?: string | null
          vendedor_fixo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_vendedor_fixo_id_fkey"
            columns: ["vendedor_fixo_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nome: string
          telefone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      config_vendedores: {
        Row: {
          created_at: string | null
          especialidade_marca: string
          id: string
          prioridade: Database["public"]["Enums"]["prioridade_vendedor"]
          status_online: boolean | null
          ultimo_atendimento_at: string | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          especialidade_marca: string
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_vendedor"]
          status_online?: boolean | null
          ultimo_atendimento_at?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          especialidade_marca?: string
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_vendedor"]
          status_online?: boolean | null
          ultimo_atendimento_at?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_vendedores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencoes: {
        Row: {
          atendimento_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          resolvida: boolean | null
          tipo: Database["public"]["Enums"]["intervencao_tipo"]
          updated_at: string | null
          vendedor_id: string | null
        }
        Insert: {
          atendimento_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          resolvida?: boolean | null
          tipo: Database["public"]["Enums"]["intervencao_tipo"]
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Update: {
          atendimento_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          resolvida?: boolean | null
          tipo?: Database["public"]["Enums"]["intervencao_tipo"]
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervencoes_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencoes_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          atendimento_id: string | null
          conteudo: string
          created_at: string | null
          id: string
          remetente_id: string | null
          remetente_tipo: string
        }
        Insert: {
          atendimento_id?: string | null
          conteudo: string
          created_at?: string | null
          id?: string
          remetente_id?: string | null
          remetente_tipo: string
        }
        Update: {
          atendimento_id?: string | null
          conteudo?: string
          created_at?: string | null
          id?: string
          remetente_id?: string | null
          remetente_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_remetente_id_fkey"
            columns: ["remetente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      status_atendimento: {
        Row: {
          alterado_por_id: string | null
          atendimento_id: string | null
          created_at: string | null
          id: string
          status_anterior:
            | Database["public"]["Enums"]["atendimento_status"]
            | null
          status_novo: Database["public"]["Enums"]["atendimento_status"]
        }
        Insert: {
          alterado_por_id?: string | null
          atendimento_id?: string | null
          created_at?: string | null
          id?: string
          status_anterior?:
            | Database["public"]["Enums"]["atendimento_status"]
            | null
          status_novo: Database["public"]["Enums"]["atendimento_status"]
        }
        Update: {
          alterado_por_id?: string | null
          atendimento_id?: string | null
          created_at?: string | null
          id?: string
          status_anterior?:
            | Database["public"]["Enums"]["atendimento_status"]
            | null
          status_novo?: Database["public"]["Enums"]["atendimento_status"]
        }
        Relationships: [
          {
            foreignKeyName: "status_atendimento_alterado_por_id_fkey"
            columns: ["alterado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_atendimento_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          nome: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vendedor_supervisor: {
        Row: {
          created_at: string | null
          id: string
          supervisor_id: string
          updated_at: string | null
          vendedor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          supervisor_id: string
          updated_at?: string | null
          vendedor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          supervisor_id?: string
          updated_at?: string | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendedor_supervisor_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendedor_supervisor_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "vendedor" | "supervisor" | "super_admin"
      atendimento_status:
        | "ia_respondendo"
        | "aguardando_cliente"
        | "vendedor_intervindo"
        | "aguardando_orcamento"
        | "aguardando_fechamento"
        | "encerrado"
      intervencao_tipo:
        | "orcamento"
        | "ajuda_humana"
        | "fechamento_pedido"
        | "garantia"
        | "reembolso"
        | "troca"
      prioridade_vendedor: "1" | "2" | "3"
      user_role: "vendedor" | "supervisor" | "admin"
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
      app_role: ["vendedor", "supervisor", "super_admin"],
      atendimento_status: [
        "ia_respondendo",
        "aguardando_cliente",
        "vendedor_intervindo",
        "aguardando_orcamento",
        "aguardando_fechamento",
        "encerrado",
      ],
      intervencao_tipo: [
        "orcamento",
        "ajuda_humana",
        "fechamento_pedido",
        "garantia",
        "reembolso",
        "troca",
      ],
      prioridade_vendedor: ["1", "2", "3"],
      user_role: ["vendedor", "supervisor", "admin"],
    },
  },
} as const
