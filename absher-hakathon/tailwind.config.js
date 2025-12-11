/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'spin-slow': 'spin 8s linear infinite',
                'scan': 'scan 2s linear infinite',
            },
            keyframes: {
                scan: {
                    '0%': { transform: 'translateY(-100%)', opacity: 0 },
                    '50%': { opacity: 1 },
                    '100%': { transform: 'translateY(100%)', opacity: 0 },
                }
            }
        },
    },
    plugins: [],
}
