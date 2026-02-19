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
  assigned_to_user_id?: number | null;
  // assigned_to_role removed
  custom_flow?: boolean;
}

export interface UpdateRequestInput {
  status?: RequestStatus;
  comment?: string;
}

