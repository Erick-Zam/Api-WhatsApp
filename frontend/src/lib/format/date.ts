const asDate = (value?: string | number | Date | null) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
};

export const formatDateShort = (value?: string | number | Date | null) => {
    const date = asDate(value);
    if (!date) {
        return '-';
    }

    return date.toLocaleDateString([], {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    });
};

export const formatDateFull = (value?: string | number | Date | null) => {
    const date = asDate(value);
    if (!date) {
        return '-';
    }

    return date.toLocaleString([], {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatDateRelative = (value?: string | number | Date | null) => {
    const date = asDate(value);
    if (!date) {
        return '-';
    }

    const now = Date.now();
    const diffMs = now - date.getTime();

    if (diffMs < 60_000) {
        return 'now';
    }

    if (diffMs < 3_600_000) {
        return `${Math.floor(diffMs / 60_000)}m`;
    }

    if (diffMs < 86_400_000) {
        return `${Math.floor(diffMs / 3_600_000)}h`;
    }

    return `${Math.floor(diffMs / 86_400_000)}d`;
};
