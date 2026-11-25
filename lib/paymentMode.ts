// Same deployment switch as zonaapoteker. Public env values are set at build time.
export const PAYMENT_MODE = (process.env.NEXT_PUBLIC_PAYMENT_MODE ?? 'manual').toLowerCase();
export const IS_MIDTRANS_PAYMENT_ENABLED = PAYMENT_MODE === 'midtrans' || PAYMENT_MODE === 'online';
