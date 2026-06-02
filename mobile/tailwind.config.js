/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: "#6366F1",
                brandDark: "#4F46E5",
                accent: "#8B5CF6",
                background: "#F7F8FA", 
                backgroundLight: "#F1F5F9",
                card: "#FFFFFF",
                border: "#E2E8F0",
                primary: "#0F172A",
                muted: "#64748B",
                success: "#10B981",
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
