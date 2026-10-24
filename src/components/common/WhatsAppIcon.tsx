import React from 'react';

export interface WhatsAppIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: 'official' | 'monochrome';
  className?: string;
  weight?: string;
}

/**
 * Ícone Oficial e Fiel do WhatsApp (Meta Brand Guidelines)
 * 
 * - variant="official": Círculo/bolha verde #25D366 com fone branco oficial.
 * - variant="monochrome": Traçado ou preenchimento fiel usando currentColor para herdar classes do Tailwind.
 */
export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({
  size = 20,
  variant = 'official',
  className = '',
  weight: _weight,
  ...props
}) => {
  if (variant === 'official') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none ${className}`}
        aria-label="WhatsApp"
        {...props}
      >
        {/* Balão/Bolha Oficial Verde WhatsApp (#25D366) */}
        <path
          d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 1.81.482 3.51 1.325 4.978L2 22l5.187-1.306A9.946 9.946 0 0012 22.001c5.522 0 10-4.478 10-10 0-5.523-4.478-10-10-10z"
          fill="#25D366"
        />
        {/* Telefone Fone Branco (#FFFFFF) Fiel ao Original */}
        <path
          d="M17.472 14.382c-.301-.15-1.782-.88-2.058-.98-.276-.1-.477-.15-.678.15-.201.302-.779.98-.955 1.18-.176.201-.351.226-.653.076-.301-.15-1.272-.469-2.423-1.496-.896-.799-1.501-1.786-1.677-2.087-.176-.302-.019-.465.132-.615.136-.135.301-.352.452-.527.151-.176.201-.302.302-.503.101-.201.05-.377-.025-.527-.075-.151-.678-1.633-.929-2.236-.245-.588-.494-.508-.678-.517-.176-.009-.377-.01-.578-.01-.201 0-.527.075-.803.376-.276.302-1.054 1.03-1.054 2.512 0 1.482 1.079 2.913 1.23 3.114.151.201 2.124 3.243 5.145 4.548.718.311 1.279.497 1.716.636.721.229 1.377.197 1.896.12.578-.086 1.782-.728 2.033-1.431.251-.703.251-1.306.176-1.431-.076-.126-.277-.201-.578-.352z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Versão monocromática fiel que respeita o currentColor / text-* do Tailwind
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="WhatsApp"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.68C7.02 10.88 7.9 12.04 8.02 12.2C8.14 12.37 9.73 14.82 12.16 15.87C12.74 16.12 13.19 16.27 13.54 16.38C14.13 16.57 14.66 16.54 15.09 16.48C15.57 16.41 16.56 15.88 16.77 15.3C16.97 14.71 16.97 14.21 16.91 14.11C16.85 14.01 16.7 13.95 16.46 13.83C16.23 13.71 15.09 13.15 14.88 13.07C14.67 12.99 14.51 12.95 14.36 13.19C14.2 13.43 13.76 13.95 13.62 14.11C13.49 14.27 13.35 14.29 13.12 14.17C12.88 14.05 11.9 13.73 10.74 12.7C9.84 11.9 9.23 10.91 9.07 10.63C8.91 10.35 9.05 10.2 9.17 10.08C9.28 9.97 9.41 9.79 9.53 9.65C9.65 9.51 9.69 9.41 9.77 9.25C9.85 9.09 9.81 8.95 9.75 8.83C9.69 8.71 9.23 7.57 9.03 7.11C8.84 6.66 8.65 6.72 8.53 6.72V7.33Z"
      />
    </svg>
  );
};

export default WhatsAppIcon;
