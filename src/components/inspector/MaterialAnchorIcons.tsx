import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Material Design Icon: Anchor / Lock
 * Google Material Symbols & Icons specification (24x24)
 */
export const MdAnchor: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M12 2a3 3 0 0 0-3 3c0 1.3.84 2.4 2 2.82V11H9a7 7 0 0 0-7 7h2a5 5 0 0 1 5-5h2v6.18A3.001 3.001 0 0 0 12 22a3 3 0 0 0 1-2.82V13h2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7h-2V7.82c1.16-.42 2-1.52 2-2.82a3 3 0 0 0-3-3zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </svg>
);

/**
 * Material Design Icon: North West (Top Left Anchor)
 */
export const MdNorthWest: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M5 15h2V8.41L17.59 19 19 17.59 8.41 7H15V5H5v10z" />
  </svg>
);

/**
 * Material Design Icon: North (Top Center Anchor)
 */
export const MdNorth: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
  </svg>
);

/**
 * Material Design Icon: North East (Top Right Anchor)
 */
export const MdNorthEast: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M9 5v2h6.59L5 17.59 6.41 19 17 8.41V15h2V5H9z" />
  </svg>
);

/**
 * Material Design Icon: West (Left Edge Pin)
 */
export const MdWest: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
);

/**
 * Material Design Icon: Center Focus Strong (Center Pivot Anchor)
 */
export const MdCenterFocus: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm7-9h-4V3h4c1.1 0 2 .9 2 2v4h-2V5zm0 14h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm0 14h4v2H5c-1.1 0-2-.9-2-2v-4h2v4z" />
  </svg>
);

/**
 * Material Design Icon: East (Right Edge Pin)
 */
export const MdEast: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
  </svg>
);

/**
 * Material Design Icon: South West (Bottom Left Anchor)
 */
export const MdSouthWest: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M15 19v-2H8.41L19 6.41 17.59 5 7 15.59V9H5v10h10z" />
  </svg>
);

/**
 * Material Design Icon: South (Bottom Center Anchor)
 */
export const MdSouth: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
  </svg>
);

/**
 * Material Design Icon: South East (Bottom Right Anchor)
 */
export const MdSouthEast: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M19 9h-2v6.59L6.41 5 5 6.41 15.59 17H9v2h10V9z" />
  </svg>
);

/**
 * Material Design Icon: Compare Arrows / Swap Horiz (Horizontal Reflow / Stretch X)
 */
export const MdStretchX: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
  </svg>
);

/**
 * Material Design Icon: Swap Vert (Vertical Reflow / Stretch Y)
 */
export const MdStretchY: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M9 6.99L5 3 1.01 6.99h3V14h2V6.99h2.99zM15 17.01h-3V10h-2v7.01H7.01L11 21l3.99-3.99z" />
  </svg>
);

/**
 * Material Design Icon: Open In Full / Aspect Ratio (Full Reflow / Stretch Both)
 */
export const MdStretchBoth: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z" />
  </svg>
);

/**
 * Material Design Icon: Auto Mode / Reflow Sync
 */
export const MdAutoReflow: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
  </svg>
);
