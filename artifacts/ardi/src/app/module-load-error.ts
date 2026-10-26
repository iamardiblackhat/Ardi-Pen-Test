/** Lazy import promises retain a rejection; recovery requires a fresh document. */
export function isModuleLoadError(error: Error): boolean {
  return error.name === 'ChunkLoadError' || /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk .+ failed|failed to load module script/i.test(error.message);
}
