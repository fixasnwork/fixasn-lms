// Fees and logo assets copied from zonaapoteker/consts/midtransPaymentMethods.ts.
export const PAYMENT_METHODS = [
  { code: 'qris', label: 'QRIS', logo: '/payment-logo/qris.png', snapCode: 'other_qris', fixed: 0, percentage: 0.7 },
  { code: 'gopay', label: 'GoPay', logo: '/payment-logo/gopay.png', snapCode: 'gopay', fixed: 0, percentage: 2 },
  { code: 'echannel', label: 'Mandiri Bill Payment', logo: '/payment-logo/mandiri.png', snapCode: 'echannel', fixed: 4000, percentage: 0 },
  { code: 'bri_va', label: 'BRI Virtual Account', logo: '/payment-logo/bri.png', snapCode: 'bri_va', fixed: 4000, percentage: 0 },
  { code: 'bni_va', label: 'BNI Virtual Account', logo: '/payment-logo/bni.png', snapCode: 'bni_va', fixed: 4000, percentage: 0 },
  { code: 'permata_va', label: 'Permata Virtual Account', logo: '/payment-logo/permata.png', snapCode: 'permata_va', fixed: 4000, percentage: 0 },
  { code: 'cimb_va', label: 'CIMB Virtual Account', logo: '/payment-logo/cimb.png', snapCode: 'cimb_va', fixed: 4000, percentage: 0 },
] as const;

export type PaymentMethodCode = typeof PAYMENT_METHODS[number]['code'];
export function getPaymentMethod(code: unknown) {
  return PAYMENT_METHODS.find((method) => method.code === code);
}
export function calculateAdminFee(amount: number, code: PaymentMethodCode) {
  const method = getPaymentMethod(code)!;
  return Math.ceil(Math.max(0, Math.round(amount)) * method.percentage / 100 + method.fixed);
}
