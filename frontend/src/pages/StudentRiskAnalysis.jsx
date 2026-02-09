import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const StudentRiskAnalysis = ({ riskData }) => {
    if (!riskData) return null;

    // Default Fallbacks if AI omits data
    const copyPercent = riskData.copyLikelihood || riskData.riskScore || 0;
    const breakdown = riskData.breakdown || { copy: copyPercent, ownWritten: 100 - copyPercent, aiRefined: 0 };

    // Data for the Bar/Donut
    // The user image showed a bar, but listed "pie chart" ingredients.
    // The image was actually a single big bar or a gauge. 
    // I will implement a visual closely matching the "100% of text is likely AI" (Copy) banner.

    // Colors based on the user's image style (Orange/Yellow for AI/Copy, Blue/Grey for Human/Own)
    const getRiskColor = (percent) => {
        if (percent === 0) return '#000000'; // No Risk (Black)
        if (percent <= 25) return '#10b981'; // Safe (Green)
        if (percent <= 50) return '#eab308'; // Low Risk (Yellow - slightly darker for visibility)
        return '#ef4444'; // High Risk (Red)
    };

    const riskColor = getRiskColor(copyPercent);

    return (
        <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>

            {/* Disclaimer */}
            <div style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div>
                    <strong style={{ display: 'block', color: '#92400e', fontSize: '0.9rem' }}>Disclaimer</strong>
                    <span style={{ color: '#b45309', fontSize: '0.85rem' }}>For more accurate results, add at least 80 words of student work.</span>
                </div>
            </div>

            {/* Main Percentage Display */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '4rem', fontWeight: '800', color: riskColor, margin: 0, lineHeight: 1 }}>
                    {copyPercent}%
                </h1>
                <p style={{ fontSize: '1.2rem', color: '#475569', margin: '5px 0 20px 0' }}>
                    of text is likely <strong>Copy</strong> ⓘ
                </p>

                {/* Progress Bar Visual */}
                <div style={{
                    maxWidth: '400px',
                    margin: '0 auto',
                    height: '20px',
                    background: '#e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    display: 'flex'
                }}>
                    <div style={{ width: `${breakdown.copy}%`, background: '#f59e0b', height: '100%' }} title="Copy" />
                    <div style={{ width: `${breakdown.aiRefined}%`, background: '#60a5fa', height: '100%' }} title="AI Refined" />
                    <div style={{ width: `${breakdown.ownWritten}%`, background: '#3b82f6', height: '100%' }} title="Own Written" />
                </div>
                <div style={{ maxWidth: '400px', margin: '5px auto 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>Copy</span>
                    <span>Own Written</span>
                </div>
            </div>

            {/* Legend / Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#334155' }}>Copy-generated</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>{breakdown.copy}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#60a5fa' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#334155' }}>Refined</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>{breakdown.aiRefined}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#334155' }}>Own-written</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>{breakdown.ownWritten}%</span>
                </div>
            </div>

            {/* Main Copy Contributors */}
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Main Copy Contributors ⓘ
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {riskData.contributors?.map((item, index) => (
                        <div key={index} style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '15px',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                            {/* Level Indicator */}
                            <div style={{ minWidth: '80px', textAlign: 'center' }}>
                                <span style={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    color: item.impact === 'High' ? '#b45309' : '#15803d',
                                    marginBottom: '4px'
                                }}>
                                    {item.impact}
                                </span>
                                <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: item.impact === 'High' ? '100%' : item.impact === 'Medium' ? '60%' : '30%',
                                        height: '100%',
                                        background: item.impact === 'High' ? '#f59e0b' : '#22c55e'
                                    }}></div>
                                </div>
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    {/* Icon placeholder using emoji for now */}
                                    <span style={{ fontSize: '1.2rem' }}>🎯</span>
                                    <span style={{ fontWeight: '600', color: '#334155' }}>{item.factor}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                                    {item.description || "Significant match found in database."}
                                </p>
                            </div>

                            {/* Chevron */}
                            <div style={{ color: '#94a3b8' }}>▼</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Understanding Results */}
            <div style={{ maxWidth: '800px', margin: '40px auto 0', borderTop: '1px solid #e2e8f0', paddingTop: '30px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '10px' }}>
                    ^ Understanding your results
                </h3>
                <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    {riskData.detailedAnalysis || "Our detection system flags text that may be copied or unoriginal. use your best judgment when reviewing these results. Never rely on this detection solely to make academic decisions."}
                </p>
            </div>

        </div>
    );
};

export default StudentRiskAnalysis;
