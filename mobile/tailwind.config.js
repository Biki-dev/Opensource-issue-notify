/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: "#D97706",
                accent: "#FACC15",
                dark: "#111111",
                background: "#FFF7F1",
                card: "#FFFFFF",
                border: "#E9E3DD",
                primary: "#0B1220",
                muted: "#5B6478",
                success: "#14B8A6",
                danger: "#EF4444",
            },
            fontFamily: {
                poppins: ["Poppins_600SemiBold"],
                "poppins-bold": ["Poppins_700Bold"],
                inter: ["Inter_400Regular"],
                "inter-medium": ["Inter_500Medium"],
                "inter-semibold": ["Inter_600SemiBold"],
                montserrat: ["Montserrat_700Bold"],
                mono: ["JetBrainsMono_400Regular"],
                brand: ["PlayfairDisplay_500Medium"],
            },
        },
    },
    plugins: [],
}
