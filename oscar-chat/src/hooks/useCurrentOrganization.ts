import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";

export function useCurrentOrganization() {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  
  useEffect(() => {
    // Extract subdomain from current URL
    const hostname = window.location.hostname;
    
    if (hostname.includes('localhost')) {
      // For development: subdomain.localhost:port
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost') {
        setSubdomain(parts[0]);
      }
    } else {
      // Special case: www.getoscar.ai or getoscar.ai maps to jverre
      if (hostname === 'www.getoscar.ai' || hostname === 'getoscar.ai') {
        setSubdomain('jverre');
      } else {
        // For production: subdomain.domain.com
        const parts = hostname.split('.');
        if (parts.length >= 3) {
          const sub = parts[0];
          // Skip common subdomains that shouldn't be treated as tenant subdomains
          if (sub !== 'www' && sub !== 'api' && sub !== 'admin') {
            setSubdomain(sub);
          }
        }
      }
    }
  }, []);

  // Get organization by subdomain
  const organization = useQuery(
    api.organizations.getBySubdomain,
    subdomain ? { subdomain } : "skip"
  );

  return {
    subdomain,
    organization,
    isLoading: subdomain !== null && organization === undefined,
  };
}