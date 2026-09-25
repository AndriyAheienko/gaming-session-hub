export const isPostgresError = (error: unknown): error is { code: string; constraint?: string } => {
    return error instanceof Error && 'code' in error && typeof error.code === 'string';
};
