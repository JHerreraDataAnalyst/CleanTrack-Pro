/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#1D4ED8', // Azul institucional
        'brand-success': '#10B981', // Verde semáforo
        'brand-warning': '#F59E0B', // Amarillo semáforo
        'brand-danger': '#EF4444',  // Rojo semáforo
        'brand-white': '#FFFFFF',
        'brand-light': '#F3F4F6',   // Fondo claro
        'brand-dark': '#1F2937',    // Texto oscuro
      }
    },
  },
  plugins: [],
}
