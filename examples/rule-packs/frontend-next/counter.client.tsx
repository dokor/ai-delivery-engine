// next/client-server-boundary — "use client" is added deliberately, and only
// interactive UI lives here. Server-only code (secrets, DB, data access) stays
// in server components, route handlers or server actions.
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>;
}
