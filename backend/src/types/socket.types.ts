export interface callbackError {
    success: boolean;
    message?: string;
    errors?: Record<string, string>;
}
