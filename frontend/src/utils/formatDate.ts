export const formatSessionDate = (isoString: string): string => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};
