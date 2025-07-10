import { useQuery } from 'convex/react';
import { useAuth } from '@/components/providers/AuthProvider';
import { FunctionReference, FunctionArgs } from 'convex/server';

export function useAuthenticatedQuery<T extends FunctionReference<"query">>(
  query: T,
  args?: Omit<FunctionArgs<T>, 'userId'>
) {
  const { userId } = useAuth();
  
  return useQuery(
    query,
    userId ? { ...args, userId } as FunctionArgs<T> : "skip"
  );
}
