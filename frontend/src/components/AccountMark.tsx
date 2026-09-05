export function AccountMark({ kind, small = false }: { kind: 'ob' | 'ik'; small?: boolean }) {
  const fill = kind === 'ob' ? '#8B5E3C' : '#2F5D50';
  const label = kind === 'ob' ? 'OB' : 'IK';
  return (
    <svg className={`mark ${small ? 'mark-sm' : ''}`} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={fill} />
      <text x="16" y="21" textAnchor="middle" fontFamily="Outfit,system-ui,sans-serif" fontSize="11" fontWeight="700" fill="#fff">
        {label}
      </text>
    </svg>
  );
}
