import type { CurrentUserResponse, TokenPairResponse } from "@/lib/api/generated/model";
import { PERMISSION_CODES } from "@/lib/permission-codes.generated";

export interface DemoAccount {
  email: string;
  name: string;
  roleCode: string;
  roleName: string;
  permissions: string[];
}

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  "admin@ecofashion.vn": {
    email: "admin@ecofashion.vn",
    name: "Quản Trị Viên FITLY",
    roleCode: "ADMIN",
    roleName: "Quản trị viên toàn quyền",
    permissions: [...PERMISSION_CODES],
  },
  "kho@ecofashion.vn": {
    email: "kho@ecofashion.vn",
    name: "Nhân Viên Kho FITLY",
    roleCode: "WAREHOUSE",
    roleName: "Nhân viên kho",
    permissions: [
      "product.inventory.read",
      "product.inventory.adjust",
      "product.inventory.receive",
      "product.product.read",
      "reporting.inventory.read",
    ],
  },
  "banhang@ecofashion.vn": {
    email: "banhang@ecofashion.vn",
    name: "Nhân Viên Bán Hàng FITLY",
    roleCode: "SALES",
    roleName: "Nhân viên bán hàng",
    permissions: [
      "order.order.read",
      "order.order.status.update",
      "order.order.cancel",
      "order.return.read",
      "order.return.process",
      "review.review.read",
      "review.review.moderate",
      "review.review.reply",
      "product.product.read",
      "identity.user.read",
    ],
  },
  "ketoan@ecofashion.vn": {
    email: "ketoan@ecofashion.vn",
    name: "Nhân Viên Kế Toán FITLY",
    roleCode: "ACCOUNTANT",
    roleName: "Kế toán",
    permissions: [
      "reporting.dashboard.read",
      "reporting.revenue.read",
      "reporting.inventory.read",
      "payment.payment.read",
      "payment.transfer.confirm",
      "payment.refund.create",
      "payment.refund.process",
      "order.order.read",
    ],
  },
  "marketing@ecofashion.vn": {
    email: "marketing@ecofashion.vn",
    name: "Nhân Viên Marketing FITLY",
    roleCode: "MARKETING",
    roleName: "Nhân viên Marketing",
    permissions: [
      "promotion.promotion.read",
      "promotion.promotion.manage",
      "system.banner.manage",
      "system.notification.send",
      "reporting.dashboard.read",
      "reporting.revenue.read",
      "product.product.read",
    ],
  },
};

export function getDemoTokenPair(email: string): TokenPairResponse {
  const account = DEMO_ACCOUNTS[email.toLowerCase()] ?? DEMO_ACCOUNTS["admin@ecofashion.vn"];
  return {
    accessToken: `mock-access-token-${account.roleCode.toLowerCase()}`,
    refreshToken: `mock-refresh-token-${account.roleCode.toLowerCase()}`,
    accessExpiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: `mock-user-${account.roleCode.toLowerCase()}`,
      email: account.email,
      fullName: account.name,
      roleCode: account.roleCode,
      status: "ACTIVE",
      createdAt: "2026-09-01T00:00:00Z",
    },
  };
}

export function getDemoCurrentUser(token?: string | null): CurrentUserResponse {
  let matched = DEMO_ACCOUNTS["admin@ecofashion.vn"];
  if (token) {
    for (const acc of Object.values(DEMO_ACCOUNTS)) {
      if (token.includes(acc.roleCode.toLowerCase())) {
        matched = acc;
        break;
      }
    }
  }

  return {
    id: `mock-user-${matched.roleCode.toLowerCase()}`,
    email: matched.email,
    fullName: matched.name,
    roleCode: matched.roleCode,
    roleName: matched.roleName,
    permissionCodes: matched.permissions,
    status: "ACTIVE",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
}
