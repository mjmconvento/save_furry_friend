/// <reference types="vite/client" />

// Vite's client types already declare every asset import (`*.svg`, `*.png`,
// `*.css`, …) as a URL string, and they type `import.meta.env`. The five
// hand-written `declare module` blocks that used to live here typed those as
// `any`, which was strictly worse than the types Vite ships.
