import {
  authControllerChangePassword,
  authControllerForgotPassword,
  authControllerLogin,
  authControllerLogout,
  authControllerMe,
  authControllerResetPassword,
} from "@/lib/api/generated/auth/auth";
import {
  meControllerAvatar,
  meControllerUpdate,
} from "@/lib/api/generated/users/users";
import { shopControllerSession } from "@/lib/api/generated/shops/shops";
import type {
  ShopSessionResponse,
  TokenPairResponse,
  UserProfileResponse,
} from "@/lib/api/generated/model";
import type { CurrentUserWithShop } from "@/features/shop/types/shop";
import { apiErrorCode, apiErrorMessage } from "@/lib/api-error";
import { CUSTOMER_ROLE } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import type { LoginInput } from "@/features/identity/schemas/login-schema";
import type { ChangePasswordInput } from "@/features/identity/schemas/change-password-schema";
import type { ForgotPasswordInput } from "@/features/identity/schemas/forgot-password-schema";
import type { ResetPasswordInput } from "@/features/identity/schemas/reset-password-schema";
import type { ProfileInput } from "@/features/identity/schemas/profile-schema";

/*
 * API xác thực của feature identity — nơi DUY NHẤT nói chuyện với các endpoint
 * /auth/* và /users/me. Component không gọi thẳng; đi qua hooks/.
 *
 * Hàm Orval sinh (authControllerLogin…) sở hữu URL/method/kiểu; lớp này chỉ
 * map form input → request, thêm phần kỹ thuật (deviceName) và chuẩn hoá lỗi.
 */

/*
 * Lỗi ném ra từ lớp auth. Mang `code` của backend (IDENTITY_INVALID_CREDENTIALS,
 * IDENTITY_ACCOUNT_LOCKED…) để UI rẽ nhánh mà không so chuỗi thông báo.
 */
export class AuthError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/* Mã riêng của frontend: tài khoản khách cố vào khu quản trị. */
export const NOT_STAFF_CODE = "ADMIN_NOT_STAFF";

function deviceName(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Trình duyệt";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return `${browser} trên ${os || "thiết bị"} (quản trị)`.slice(0, 120);
}

/*
 * Phiên vendor (GET /shop/session): chủ/nhân viên gian hàng đăng nhập bằng tài khoản vai `customer` (vai của họ nằm trong ShopMember, không phải User.roleId)
 * nên /auth/me KHÔNG trả quyền `shop.*`. Trả null khi không phải thành viên (403 SHOP_NOT_MEMBER) hoặc lỗi — nhân viên sàn đa phần cũng rơi vào đây.
 */
async function fetchShopSession(accessToken?: string): Promise<ShopSessionResponse | null> {
  try {
    return await shopControllerSession(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined);
  } catch {
    return null;
  }
}

/*
 * Đăng nhập. Backend trả cặp token + hồ sơ rút gọn trong body. Tài khoản vai `customer` chỉ được vào khi là THÀNH VIÊN một gian hàng (chủ/nhân viên shop —
 * cổng vendor); khách thường bị chặn NGAY tại đây (không lưu token). Backend vẫn là nơi enforce quyền thật trên từng endpoint.
 */
export async function login(input: LoginInput): Promise<TokenPairResponse> {
  let pair: TokenPairResponse;
  try {
    pair = await authControllerLogin({
      email: input.email,
      password: input.password,
      deviceName: deviceName(),
    });
  } catch (error) {
    throw new AuthError(
      apiErrorMessage(error, "Đăng nhập thất bại. Vui lòng thử lại."),
      apiErrorCode(error),
    );
  }
  if (pair.user?.roleCode === CUSTOMER_ROLE && !(await fetchShopSession(pair.accessToken))) {
    throw new AuthError(
      "Tài khoản khách hàng không có quyền vào khu quản trị.",
      NOT_STAFF_CODE,
    );
  }
  return pair;
}

/*
 * Hồ sơ người đang đăng nhập + mã quyền hiệu lực. Gộp `GET /auth/me` (quyền của vai nhân viên sàn) với `GET /shop/session` (quyền `shop.*` của vai trong
 * gian hàng) thành MỘT hồ sơ: sidebar/guard/PermissionGate chỉ cần hỏi `permissionCodes` — mã `shop.*` và `supplier.*` không bao giờ trùng nhau.
 * `shopMemberships` mang cả trạng thái gian hàng để RoleGuard hiện đúng màn "đang chờ duyệt / đã bị khoá".
 */
export async function getCurrentUser(): Promise<CurrentUserWithShop> {
  const [me, session] = await Promise.all([authControllerMe(), fetchShopSession()]);
  if (!session) return { ...me, shopMemberships: [] };
  const live = session.shop.status === "approved";
  // Người CHỈ là khách trên sàn nhưng làm chủ/nhân viên gian hàng: nhãn vai hiển thị là vai trong shop ("Chủ gian hàng", "Nhân viên gian hàng"),
  // không phải "Khách hàng" của tài khoản toàn sàn. Nhân viên sàn kiêm shop giữ nguyên vai sàn.
  const shopRoleLabel = me.roleCode === CUSTOMER_ROLE ? session.roleName : undefined;
  return {
    ...me,
    ...(shopRoleLabel ? { roleName: shopRoleLabel } : {}),
    // Quyền shop chỉ hiệu lực khi gian hàng đang HOẠT ĐỘNG (backend cũng 403 mọi route /shop/** khi shop chưa duyệt/bị khoá).
    permissionCodes: [...new Set([...(me.permissionCodes ?? []), ...(live ? session.permissions : [])])],
    shopMemberships: [
      {
        shopId: session.shop.id,
        shopName: session.shop.name,
        role: session.roleCode as "shop_owner" | "shop_staff",
        status: "active",
        shopStatus: session.shop.status as "pending" | "approved" | "suspended" | "rejected",
      },
    ],
  };
}

/*
 * Đăng xuất: backend thu hồi refresh token + blacklist access token hiện tại.
 * Best-effort — không ném lỗi, vì client PHẢI xoá state cục bộ dù server trả gì.
 */
export async function logout(): Promise<void> {
  const { refreshToken } = useAuthStore.getState();
  try {
    await authControllerLogout({ refreshToken: refreshToken ?? undefined });
  } catch {
    // bỏ qua — caller xoá state cục bộ dù sao
  }
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  try {
    await authControllerChangePassword({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });
  } catch (error) {
    throw new AuthError(
      apiErrorMessage(error, "Đổi mật khẩu thất bại."),
      apiErrorCode(error),
    );
  }
}

/* Gửi OTP đặt lại mật khẩu — backend luôn 200 (không lộ email có tồn tại). */
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  try {
    await authControllerForgotPassword({ email: input.email });
  } catch (error) {
    throw new AuthError(
      apiErrorMessage(error, "Không gửi được mã xác nhận."),
      apiErrorCode(error),
    );
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  try {
    await authControllerResetPassword({
      email: input.email,
      otp: input.otp,
      newPassword: input.newPassword,
    });
  } catch (error) {
    throw new AuthError(
      apiErrorMessage(error, "Đặt lại mật khẩu thất bại."),
      apiErrorCode(error),
    );
  }
}

/* Sửa họ tên / SĐT của chính mình (PATCH /users/me). */
export async function updateProfile(
  input: ProfileInput,
): Promise<UserProfileResponse> {
  return meControllerUpdate({
    fullName: input.fullName,
    phone: input.phone ? input.phone : null,
  });
}

/* Đổi ảnh đại diện (PUT /users/me/avatar, multipart `file`). */
export async function updateAvatar(file: File): Promise<UserProfileResponse> {
  return meControllerAvatar({ file });
}
