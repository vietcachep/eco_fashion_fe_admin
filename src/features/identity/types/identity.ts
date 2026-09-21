/*
 * DTO identity chưa có trong schema Swagger (danh sách trả PageResponse không
 * generic) — chép từ backend `identity/loginhistory/dto` và `identity/audit/dto`.
 */
export interface LoginHistoryResponse {
  id: string;
  userId: string | null;
  email: string;
  success: boolean;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  moduleCode: string;
  entityType: string;
  entityId: string | null;
  entityCode: string | null;
  requestId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
}
