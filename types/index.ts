export type UserRole =
  | 'empleado'
  | 'sistemas'
  | 'gestion_humana'
  | 'cartera'
  | 'gerencia'
  | 'rectoria'
  | 'servicios_generales'
  | 'admin';

export type RequestType = 'compra' | 'permiso' | 'soporte' | 'certificado' | 'mantenimiento' | 'personalizada';

export type UrgencyLevel = 'bajo' | 'medio' | 'alto';

export type RequestStatus = 'pendiente' | 'en_proceso' | 'aceptado' | 'rechazado' | 'resuelto' | 'cerrado';

export type ApprovalAction = 'creado' | 'enviado' | 'aprobado' | 'rechazado' | 'comentado';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_confirmed: number;
  created_at: string;
  updated_at: string;
  cedula?: string | null;
  cargo?: string | null;
  area?: string | null;
  salario?: number | null;
  fecha_ingreso?: string | null;
  can_access_ausentismo?: boolean | null;
}

export interface Request {
  id: number;
  type: RequestType;
  title: string;
  description: string;
  reason?: string;
  urgency: UrgencyLevel;
  status: RequestStatus;
  user_id: number;
  current_approver_role?: UserRole | null;
  assigned_to_user_id?: number | null;
  custom_flow?: boolean;
  last_comment?: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  assigned_to?: User;
  attachments?: Attachment[];
  history?: ApprovalHistory[];
  last_actor_name?: string | null;
  last_actor_role?: string | null;
  // Campos de ausencia (solo type='permiso')
  tipo_ausencia?: string | null;
  concepto_ausencia?: string | null;
  fecha_ausencia?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  horas_ausencia?: number | null;
  dias_decimal?: number | null;
  // Soporte de la ausencia que el aprobador dejó pendiente
  soporte_estado?: SoporteEstado | null;
  soporte_solicitado_por?: number | null;
  soporte_solicitado_at?: string | null;
  soporte_entregado_at?: string | null;
  soporte_alerta_at?: string | null;
}

export type SoporteEstado = 'pendiente' | 'entregado';

export type NotificationType = 'soporte_pendiente' | 'soporte_vencido' | 'soporte_entregado';

export interface Notification {
  id: number;
  user_id: number;
  request_id: number | null;
  tipo: NotificationType;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

export interface Attachment {
  id: number;
  request_id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  path: string;
  created_at: string;
}

export interface ApprovalHistory {
  id: number;
  request_id: number;
  user_id: number;
  action: ApprovalAction;
  comment?: string;
  previous_status?: string;
  new_status?: string;
  forwarded_to_role?: string | null;
  forwarded_to_user_id?: number | null;
  forwarded_to_user_name?: string | null;
  created_at: string;
  user?: User;
  user_name?: string;
  user_role?: string;
}

export interface CreateRequestInput {
  type: RequestType;
  title: string;
  description: string;
  reason?: string;
  urgency?: UrgencyLevel;
  assigned_to_user_id?: number | null;
  custom_flow?: boolean;
  // Campos de ausencia (solo type='permiso')
  tipo_ausencia?: string | null;
  concepto_ausencia?: string | null;
  fecha_ausencia?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  horas_ausencia?: number | null;
  dias_decimal?: number | null;
}

export interface UpdateRequestInput {
  status?: RequestStatus;
  comment?: string;
}

