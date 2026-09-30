/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
    // optional: report service address for local report development (see constants/app-api-routes.ts)
    readonly VITE_REPORTING_HOST?: string;
}
