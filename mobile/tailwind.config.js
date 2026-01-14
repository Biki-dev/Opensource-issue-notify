/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: '#CEFF00', // Lime Green
                accent: '#FF3B72', // Pink
                background: '#000000',
                card: '#18181B',
                border: '#27272A',
                muted: '#A1A1AA',
            }
        },
    },
    plugins: [],
}
