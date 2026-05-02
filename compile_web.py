import os

# ---- CONFIGURACIÓN ----
CARPETA_OBJETIVO = "./web"
ARCHIVO_SALIDA = "web_codebase.txt"

EXTENSIONES = {
    ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss",
    ".md", ".html", ".svg", ".ico", ".env.local", ".env.example",
    ".yaml", ".yml", ".graphql", ".gql",
}

CARPETAS_IGNORADAS = {
    "node_modules", ".next", "out", "dist", "build",
    ".turbo", ".git", "__pycache__", ".vscode", ".idea",
}
# -----------------------

def generar_arbol(raiz, salida):
    salida.write("ESTRUCTURA DE LA WEB (Next.js):\n")
    for ruta_actual, carpetas, archivos in os.walk(raiz, topdown=True):
        carpetas[:] = [c for c in carpetas if c not in CARPETAS_IGNORADAS]
        nivel = ruta_actual.replace(raiz, "").count(os.sep)
        indentacion = "  " * nivel
        salida.write(f"{indentacion}{os.path.basename(ruta_actual)}/\n")
        for archivo in archivos:
            salida.write(f"{indentacion}  {archivo}\n")
    salida.write("\n" + "=" * 80 + "\n\n")

def compilar_web(raiz, archivo_salida):
    with open(archivo_salida, "w", encoding="utf-8") as salida:
        generar_arbol(raiz, salida)

        for ruta_actual, carpetas, archivos in os.walk(raiz, topdown=True):
            carpetas[:] = [c for c in carpetas if c not in CARPETAS_IGNORADAS]
            for archivo in archivos:
                _, ext = os.path.splitext(archivo)
                if ext.lower() in EXTENSIONES or archivo in (".env.local", ".env"):
                    ruta_completa = os.path.join(ruta_actual, archivo)
                    ruta_rel = os.path.relpath(ruta_completa, raiz)
                    try:
                        with open(ruta_completa, "r", encoding="utf-8") as f:
                            contenido = f.read()
                    except Exception as e:
                        contenido = f"[Error al leer: {e}]"
                    salida.write(f"### ARCHIVO: {ruta_rel}\n")
                    salida.write(contenido)
                    salida.write("\n\n### FIN DE ARCHIVO ###\n")
                    salida.write("-" * 80 + "\n\n")

    print(f"✅ Web compilada en: {os.path.abspath(archivo_salida)}")

if __name__ == "__main__":
    compilar_web(CARPETA_OBJETIVO, ARCHIVO_SALIDA)