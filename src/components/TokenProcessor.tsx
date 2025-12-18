import React from "react";

// TokenProcessor is deprecated — Firebase handles token lifecycle via onIdTokenChanged.
export default function TokenProcessor() {
  React.useEffect(() => {
    // no-op; left in place to avoid breaking imports during migration
  }, []);

  return null;
}
