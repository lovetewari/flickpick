// Remounts on every route change (unlike layout.js), giving each page a soft
// fade-in so navigation feels intentional instead of a hard content swap.
export default function Template({ children }) {
  return <div className="route-fade">{children}</div>;
}
