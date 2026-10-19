import React from 'react';
import { RECOVERY_STAGES, getRecoveryStageInfo } from '../utils/stages';

export default function RecoveryProgressBar({ status, recoveryProgress, onStageChange }) {
    const stageInfo = getRecoveryStageInfo(status, recoveryProgress);
    const isInteractive = typeof onStageChange === 'function';

    return (
        <div style={styles.container}>
            <div style={styles.headerRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={styles.title}>Recovery Progress:</span>
                    <span style={{
                        ...styles.statusBadge,
                        background: stageInfo.badgeBg,
                        color: stageInfo.badgeColor,
                    }}>
                        {stageInfo.label}
                    </span>
                </div>
                {stageInfo.showPercent && (
                    <span style={styles.percentText}>{stageInfo.percent}%</span>
                )}
            </div>

            {/* Continuous progress bar track */}
            <div style={styles.track}>
                <div style={{ ...styles.fill, width: `${stageInfo.percent}%` }} />
            </div>

            {/* Three Stages: Pending, In Progress, Resolved */}
            <div style={styles.stepperRow}>
                {RECOVERY_STAGES.map((st, idx) => {
                    const isResolved = stageInfo.key === 'RESOLVED';
                    const isCompleted = isResolved ? true : stageInfo.stepIndex > idx;
                    const isCurrent = stageInfo.stepIndex === idx;

                    const Tag = isInteractive ? 'button' : 'div';
                    return (
                        <Tag
                            key={st.key}
                            type={isInteractive ? 'button' : undefined}
                            onClick={isInteractive ? () => onStageChange(st.key) : undefined}
                            title={isInteractive ? `Set status to ${st.label}` : st.label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '5px 12px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: isCurrent ? 800 : 600,
                                border: isCurrent
                                    ? '2px solid #235347'
                                    : isCompleted
                                        ? '1.5px solid #235347'
                                        : '1.5px solid #8EB69B',
                                background: isCurrent
                                    ? '#235347'
                                    : isCompleted
                                        ? '#DAF1DE'
                                        : '#DAF1DE',
                                color: isCurrent
                                    ? '#DAF1DE'
                                    : isCompleted
                                        ? '#0B2B26'
                                        : '#235347',
                                cursor: isInteractive ? 'pointer' : 'default',
                                transition: 'all 0.18s ease',
                                boxShadow: isCurrent ? '0 2px 6px rgba(11,43,38,0.18)' : 'none',
                                opacity: (!isCompleted && !isCurrent) ? 0.75 : 1,
                            }}
                        >
                            <span style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 800,
                                flexShrink: 0,
                                background: isCurrent
                                    ? '#DAF1DE'
                                    : isCompleted
                                        ? '#235347'
                                        : '#8EB69B',
                                color: isCurrent
                                    ? '#0B2B26'
                                    : isCompleted
                                        ? '#DAF1DE'
                                        : '#0B2B26',
                            }}>
                                {isCompleted ? '✓' : st.step}
                            </span>
                            <span>{st.label}</span>
                        </Tag>
                    );
                })}
            </div>
        </div>
    );
}

const styles = {
    container: {
        background: '#DAF1DE',
        borderRadius: 10,
        padding: '10px 12px',
        border: '1px solid #8EB69B',
        marginTop: 10,
        marginBottom: 10,
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 12,
        fontWeight: 700,
        color: '#0B2B26',
    },
    statusBadge: {
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 12,
        border: '1px solid #8EB69B',
    },
    percentText: {
        fontSize: 12,
        fontWeight: 800,
        color: '#0B2B26',
    },
    track: {
        height: 8,
        borderRadius: 999,
        background: '#8EB69B',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 10,
    },
    fill: {
        height: '100%',
        background: '#235347',
        borderRadius: 999,
        transition: 'width 0.35s ease',
    },
    stepperRow: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
    },
};
