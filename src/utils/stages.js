export const DAMAGE_STAGES = {
    FLOOD: [
        { value: 20, label: '20% – Water Level Assessment' },
        { value: 40, label: '40% – Drainage & Debris Clearing' },
        { value: 60, label: '60% – Pumping & Drying' },
        { value: 80, label: '80% – Disinfection & Safety Certification' },
        { value: 100, label: '100% – Area Reopened' }
    ],
    ROAD_DAMAGE: [
        { value: 20, label: '20% – Site Inspection & Warning Signs' },
        { value: 40, label: '40% – Excavation & Sub-base Work' },
        { value: 60, label: '60% – Asphalt Laying & Compaction' },
        { value: 80, label: '80% – Road Marking & Safety Checks' },
        { value: 100, label: '100% – Road Fully Reopened' }
    ],
    LANDSLIDE: [
        { value: 20, label: '20% – Geotechnical Assessment & Clearing Risk' },
        { value: 40, label: '40% – Soil Stabilization & Debris Removal' },
        { value: 60, label: '60% – Retaining Wall Construction' },
        { value: 80, label: '80% – Drainage Restoration & Monitoring' },
        { value: 100, label: '100% – Area Safety Certified' }
    ],
    BRIDGE_DAMAGE: [
        { value: 20, label: '20% – Structural Inspection & Diversion' },
        { value: 40, label: '40% – Foundation Repair & Underpinning' },
        { value: 60, label: '60% – Deck & Superstructure Reconstruction' },
        { value: 80, label: '80% – Guardrail Installation & Load Testing' },
        { value: 100, label: '100% – Bridge Fully Reopened' }
    ],
    BUILDING: [
        { value: 20, label: '20% – Structural Integrity Assessment' },
        { value: 40, label: '40% – Debris Clearance & Shoring Up' },
        { value: 60, label: '60% – Core Structural Repairs' },
        { value: 80, label: '80% – Fit-outs & Utility Restoration' },
        { value: 100, label: '100% – Occupancy Certified' }
    ],
    WATER_POLLUTION: [
        { value: 20, label: '20% – Source Identification & Containment' },
        { value: 40, label: '40% – Chemical & Debris Skimming' },
        { value: 60, label: '60% – Filtration & Neutralization' },
        { value: 80, label: '80% – Quality Sampling & Lab Approval' },
        { value: 100, label: '100% – Safe Water Flow Restored' }
    ],
    OTHER: [
        { value: 20, label: '20% – Initial Damage Assessment' },
        { value: 40, label: '40% – Resource Planning & Mobilization' },
        { value: 60, label: '60% – Repair & Remediation Works' },
        { value: 80, label: '80% – Final Inspection & Verification' },
        { value: 100, label: '100% – Recovery Completed' }
    ]
};

export const getStagesForType = (damageType) => {
    if (!damageType || typeof damageType !== 'string') {
        return DAMAGE_STAGES.OTHER;
    }
    const typeKey = damageType.toUpperCase();
    return DAMAGE_STAGES[typeKey] || DAMAGE_STAGES.OTHER;
};

export const getStageLabel = (damageType, pct) => {
    // Support being called as getStageLabel(pct) or getStageLabel(damageType, pct)
    if (pct === undefined) {
        pct = typeof damageType === 'number' ? damageType : Number(damageType) || 0;
        damageType = 'OTHER';
    }
    const stages = getStagesForType(damageType);
    const numPct = Number(pct) || 0;
    const stage = stages.find(s => s.value === numPct);
    return stage ? stage.label : `${numPct}% in progress`;
};

// ── THREE RECOVERY PROGRESS STAGES ──────────────────────────────────
export const RECOVERY_STAGES = [
    { key: 'PENDING', label: 'Pending', step: 1, percent: 0 },
    { key: 'IN_PROGRESS', label: 'In Progress', step: 2, percent: 60 },
    { key: 'RESOLVED', label: 'Resolved', step: 3, percent: 100 },
];

export const getRecoveryStageInfo = (status, recoveryProgress = 0) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'REJECTED') {
        return {
            stepIndex: -1,
            key: 'REJECTED',
            label: 'Rejected',
            percent: 0,
            showPercent: false,
            badgeBg: '#ffebee',
            badgeColor: '#c62828',
        };
    }
    if (s === 'RESOLVED') {
        return {
            stepIndex: 2,
            key: 'RESOLVED',
            label: 'Resolved',
            percent: 100,
            showPercent: true,
            badgeBg: '#235347',
            badgeColor: '#DAF1DE',
        };
    }
    if (s === 'IN_PROGRESS') {
        return {
            stepIndex: 1,
            key: 'IN_PROGRESS',
            label: 'In Progress',
            percent: 60,
            showPercent: true,
            badgeBg: '#8EB69B',
            badgeColor: '#0B2B26',
        };
    }
    return {
        stepIndex: 0,
        key: 'PENDING',
        label: 'Pending',
        percent: 0,
        showPercent: false,
        badgeBg: '#DAF1DE',
        badgeColor: '#0B2B26',
    };
};
