// Water Level Alert Classification
// Threshold hierarchy: Normal (Green) < Alert Water Level (Blue: #00008B) < Minor Flood Level (Yellow: #FFCE1B) < Major Flood Level (Red: #dc2626)

export const WATER_ALERT_COLORS = {
    MAJOR: {
        status: 'MAJOR',
        label: 'MAJOR FLOOD',
        badgeLabel: '🚨 MAJOR FLOOD',
        color: '#dc2626',      // Red
        bgTint: '#fee2e2',
        borderColor: '#dc2626',
        textColor: '#991b1b',
        badgeBg: '#dc2626',
        badgeText: '#ffffff',
        icon: '🚨',
    },
    MINOR: {
        status: 'MINOR',
        label: 'MINOR FLOOD',
        badgeLabel: '⚠️ MINOR FLOOD',
        color: '#FFCE1B',      // Yellow (#FFCE1B)
        bgTint: '#FFF9D2',
        borderColor: '#FFCE1B',
        textColor: '#714B00',
        badgeBg: '#FFCE1B',
        badgeText: '#000000',
        icon: '⚠️',
    },
    ALERT: {
        status: 'ALERT',
        label: 'ALERT LEVEL',
        badgeLabel: '⚡ ALERT LEVEL',
        color: '#00008B',      // Blue (#00008B)
        bgTint: '#E8EEF9',
        borderColor: '#00008B',
        textColor: '#00008B',
        badgeBg: '#00008B',
        badgeText: '#ffffff',
        icon: '⚡',
    },
    NORMAL: {
        status: 'NORMAL',
        label: 'NORMAL',
        badgeLabel: '✅ NORMAL',
        color: '#235347',      // Green
        bgTint: '#DAF1DE',
        borderColor: '#8EB69B',
        textColor: '#0B2B26',
        badgeBg: '#235347',
        badgeText: '#DAF1DE',
        icon: '✅',
    }
};

export function getWaterAlertInfo(currentLevel, majorFloodLevel, minorFloodLevel, alertWaterLevel) {
    const cur = parseFloat(currentLevel);
    const maj = parseFloat(majorFloodLevel);
    const min = parseFloat(minorFloodLevel);
    const alt = parseFloat(alertWaterLevel);

    if (isNaN(cur)) return null;

    // 1. Major Flood Alert (RED)
    if (!isNaN(maj) && maj > 0 && cur >= maj) {
        return {
            ...WATER_ALERT_COLORS.MAJOR,
            current: cur,
            major: maj,
            minor: min,
            alert: alt,
            title: 'MAJOR FLOOD ALERT ACTIVE',
            message: `CRITICAL: Current water level (${cur.toFixed(2)} m) has reached or exceeded the Major Flood Level (${maj.toFixed(2)} m)! High danger of severe inundation. Immediate evacuation and flood response protocols active.`
        };
    }

    // 2. Minor Flood Alert (ORANGE)
    if (!isNaN(min) && min > 0 && cur >= min) {
        return {
            ...WATER_ALERT_COLORS.MINOR,
            current: cur,
            major: maj,
            minor: min,
            alert: alt,
            title: 'MINOR FLOOD ALERT ACTIVE',
            message: `WARNING: Current water level (${cur.toFixed(2)} m) has reached or exceeded the Minor Flood Level (${min.toFixed(2)} m)! Low-lying riverside terrain and access roads may experience localized flooding.`
        };
    }

    // 3. Alert Water Level (YELLOW)
    if (!isNaN(alt) && alt > 0 && cur >= alt) {
        return {
            ...WATER_ALERT_COLORS.ALERT,
            current: cur,
            major: maj,
            minor: min,
            alert: alt,
            title: 'WATER LEVEL ALERT ACTIVE',
            message: `CAUTION: Current water level (${cur.toFixed(2)} m) has reached or exceeded the Alert Water Level (${alt.toFixed(2)} m). River water is rising; continuous vigilance and sluice gate monitoring advised.`
        };
    }

    // Fallback: if explicit thresholds are missing but major/max is present
    if (!isNaN(maj) && maj > 0) {
        const pct = (cur / maj) * 100;
        if (pct >= 100) {
            return {
                ...WATER_ALERT_COLORS.MAJOR,
                current: cur,
                major: maj,
                title: 'MAJOR FLOOD ALERT ACTIVE',
                message: `CRITICAL: Water level (${cur.toFixed(2)} m) has exceeded 100% capacity (${maj.toFixed(2)} m)!`
            };
        }
        if (pct >= 80) {
            return {
                ...WATER_ALERT_COLORS.MINOR,
                current: cur,
                major: maj,
                title: 'MINOR FLOOD ALERT ACTIVE',
                message: `WARNING: Water level (${cur.toFixed(2)} m) has reached 80% of major threshold (${maj.toFixed(2)} m).`
            };
        }
        if (pct >= 60) {
            return {
                ...WATER_ALERT_COLORS.ALERT,
                current: cur,
                major: maj,
                title: 'WATER LEVEL ALERT ACTIVE',
                message: `CAUTION: Water level (${cur.toFixed(2)} m) has reached 60% of major threshold (${maj.toFixed(2)} m).`
            };
        }
    }

    // 4. Normal (GREEN)
    return {
        ...WATER_ALERT_COLORS.NORMAL,
        current: cur,
        major: maj,
        minor: min,
        alert: alt,
        title: 'NORMAL WATER LEVEL',
        message: `SAFE: Current water level (${cur.toFixed(2)} m) is below the Alert Level (${!isNaN(alt) ? alt.toFixed(2) : (!isNaN(min) ? (min * 0.75).toFixed(2) : '3.00')} m). River flow is normal.`
    };
}

// Map database record to alert info
export function getRecordAlertInfo(record) {
    if (!record) return WATER_ALERT_COLORS.NORMAL;
    const major = record.majorFloodLevel || record.maximumLimit;
    const minor = record.minorFloodLevel;
    const alert = record.alertWaterLevel;
    const current = record.currentLevel;

    // If thresholds are present, calculate dynamically
    if (major || minor || alert) {
        const info = getWaterAlertInfo(current, major, minor, alert);
        if (info) return info;
    }

    // Fallback to record.status string
    const status = (record.status || '').toUpperCase();
    if (status === 'CRITICAL' || status === 'MAJOR' || status === 'MAJOR_FLOOD') {
        return WATER_ALERT_COLORS.MAJOR;
    }
    if (status === 'WARNING' || status === 'MINOR' || status === 'MINOR_FLOOD') {
        return WATER_ALERT_COLORS.MINOR;
    }
    if (status === 'ALERT') {
        return WATER_ALERT_COLORS.ALERT;
    }
    return WATER_ALERT_COLORS.NORMAL;
}
