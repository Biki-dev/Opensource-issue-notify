/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: '#FFD700', // Gold/Yellow from the screenshot
                secondary: '#000000', // Black
                accent: '#F3F4F6', // Light Gray
                danger: '#EF4444',
                success: '#10B981',
            }
        },
    },
    plugins: [],
}
