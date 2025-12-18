// oauth redirect/token parsing has been removed in favor of Firebase popup flows.
export function popTokenFromLocation(): { token: null; cleanedUrl: string } {
  return { token: null, cleanedUrl: window.location.href };
}
