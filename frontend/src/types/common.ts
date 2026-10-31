export type ToastType = 'success' | 'error';

export interface ToastState {
    show: boolean;
    message: string;
    type: ToastType;
}
