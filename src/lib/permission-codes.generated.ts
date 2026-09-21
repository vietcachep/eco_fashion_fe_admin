/**
 * ⚠ FILE SINH TỰ ĐỘNG — KHÔNG SỬA TAY.
 * Nguồn: openapi/permissions.json (catalog quyền của backend eco_backend).
 * Sinh lại: npm run perms:sync
 *
 * 52 mã quyền dạng module.resource.action. Dùng để ràng buộc kiểu
 * cho PERMISSIONS trong lib/constants.ts và props của PermissionGuard / PermissionGate.
 */

export const PERMISSION_CODES = [
  "ai.chat.read",
  "ai.copy.create",
  "ai.insight.read",
  "ai.knowledge.manage",
  "ai.moderation.read",
  "ai.support.read",
  "ai.support.resolve",
  "ai.usage.read",
  "catalog.attribute.manage",
  "catalog.brand.manage",
  "catalog.category.manage",
  "catalog.category.read",
  "catalog.collection.manage",
  "identity.audit.read",
  "identity.permission.assign",
  "identity.role.read",
  "identity.role.update",
  "identity.user.create",
  "identity.user.lock",
  "identity.user.read",
  "identity.user.update",
  "order.order.cancel",
  "order.order.read",
  "order.order.status.update",
  "order.return.process",
  "order.return.read",
  "payment.method.manage",
  "payment.payment.read",
  "payment.refund.create",
  "payment.refund.process",
  "payment.transfer.confirm",
  "product.inventory.adjust",
  "product.inventory.read",
  "product.inventory.receive",
  "product.product.create",
  "product.product.delete",
  "product.product.publish",
  "product.product.read",
  "product.product.update",
  "promotion.promotion.manage",
  "promotion.promotion.read",
  "reporting.dashboard.read",
  "reporting.inventory.read",
  "reporting.revenue.read",
  "review.review.moderate",
  "review.review.read",
  "review.review.reply",
  "system.banner.manage",
  "system.notification.send",
  "system.province.manage",
  "system.setting.read",
  "system.setting.update",
] as const;

/** Mọi mã quyền hợp lệ theo catalog backend. */
export type PermissionCode = (typeof PERMISSION_CODES)[number];
