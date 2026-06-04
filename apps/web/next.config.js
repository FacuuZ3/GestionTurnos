/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // typedRoutes desactivado: la feature experimental invocaba un comando
  // npm internamente que entra en conflicto con la configuración de
  // workspaces del monorepo (npm error ENOWORKSPACES). El beneficio de
  // typedRoutes (autocompletado de rutas con tipos) no compensa el ruido
  // en el log. Se documenta como trabajo futuro habilitarlo cuando Next.js
  // mejore su soporte de workspaces.
};

module.exports = nextConfig;
