/*
 * Ngân hàng Việt Nam + mã BIN NAPAS (6 chữ số) để chủ shop chọn tài khoản nhận tiền đối soát.
 *
 * Nguồn: `eco_backend/src/modules/shop/shop/service/vn-bank-bins.ts` (VN_BANK_BINS) — backend chỉ KHUYẾN CÁO, không chặn:
 * BIN lạ vẫn được nhận (ghi `unknownBin` vào audit để sàn soát tay). Vì vậy danh sách này có thể thiếu ngân hàng mới;
 * nhập thiếu thì bổ sung ở đây, không phải đổi nghiệp vụ. Ví điện tử (MoMo, Viettel Money…) cố ý KHÔNG đưa vào —
 * đối soát chi về tài khoản ngân hàng.
 */
export interface VnBank {
  /** Mã BIN 6 chữ số — giá trị gửi lên API (`bankCode`). */
  bin: string;
  name: string;
  /** Ngân hàng lớn, xếp nhóm "Phổ biến" ở đầu danh sách chọn. */
  popular?: boolean;
}

export const VN_BANKS: readonly VnBank[] = [
  { bin: "970436", name: "Vietcombank", popular: true },
  { bin: "970415", name: "VietinBank", popular: true },
  { bin: "970418", name: "BIDV", popular: true },
  { bin: "970405", name: "Agribank", popular: true },
  { bin: "970407", name: "Techcombank", popular: true },
  { bin: "970422", name: "MB Bank", popular: true },
  { bin: "970416", name: "ACB", popular: true },
  { bin: "970432", name: "VPBank", popular: true },
  { bin: "970423", name: "TPBank", popular: true },
  { bin: "970403", name: "Sacombank", popular: true },
  { bin: "970437", name: "HDBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970443", name: "SHB" },
  { bin: "970448", name: "OCB" },
  { bin: "970426", name: "MSB" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970429", name: "SCB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970454", name: "BVBank (Bản Việt)" },
  { bin: "970449", name: "LPBank" },
  { bin: "970425", name: "ABBANK" },
  { bin: "970428", name: "Nam A Bank" },
  { bin: "970412", name: "PVcomBank" },
  { bin: "970414", name: "Oceanbank" },
  { bin: "970419", name: "NCB" },
  { bin: "970438", name: "BaoViet Bank" },
  { bin: "970433", name: "VietBank" },
  { bin: "970452", name: "KienLongBank" },
  { bin: "970409", name: "BacABank" },
  { bin: "970430", name: "PG Bank" },
  { bin: "970400", name: "SaigonBank" },
  { bin: "970406", name: "DongA Bank" },
  { bin: "970427", name: "VietABank" },
  { bin: "970439", name: "Public Bank Việt Nam" },
  { bin: "970442", name: "Hong Leong Bank Việt Nam" },
  { bin: "970424", name: "Shinhan Bank" },
  { bin: "970434", name: "Indovina Bank" },
  { bin: "970457", name: "Woori Bank" },
  { bin: "970458", name: "UOB Việt Nam" },
  { bin: "970446", name: "Co-opBank" },
  { bin: "970421", name: "VRB" },
  { bin: "970410", name: "Standard Chartered Việt Nam" },
  { bin: "970408", name: "GPBank" },
  { bin: "970444", name: "CBBank" },
  { bin: "970455", name: "IBK Hà Nội" },
  { bin: "970456", name: "IBK TP.HCM" },
  { bin: "970462", name: "Kookmin Bank Hà Nội" },
  { bin: "970466", name: "Kookmin Bank TP.HCM" },
  { bin: "668888", name: "KBank" },
  { bin: "422589", name: "CIMB Việt Nam" },
  { bin: "458761", name: "HSBC Việt Nam" },
  { bin: "796500", name: "DBS Bank" },
  { bin: "801011", name: "Nonghyup Bank" },
];

const NAME_BY_BIN: ReadonlyMap<string, string> = new Map(VN_BANKS.map((b) => [b.bin, b.name]));

/** Tên ngân hàng theo BIN; BIN ngoài danh sách → undefined (nơi gọi tự hiện mã BIN). */
export function bankNameByBin(bin?: string | null): string | undefined {
  return bin ? NAME_BY_BIN.get(bin) : undefined;
}
