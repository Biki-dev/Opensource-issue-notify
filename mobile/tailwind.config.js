/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: "#D97706",
                accent: "#FFD700",
                dark: "#1E1E1E",
                background: "#FCF7F3",
                card: "#FFFFFF",
                border: "#E6E8EB",
                primary: "#0F172A",
                muted: "#556077",
                success: "#16A34A",
                danger: "#EF4444",
            },
        },
    },
    plugins: [],
}
