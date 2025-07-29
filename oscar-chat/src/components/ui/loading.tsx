"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Standard loading states
export type LoadingState = 'idle' | 'loading' | 'error' | 'success';

// Base loading spinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  return (
    <Loader2 
      className={cn('animate-spin', sizeClasses[size], className)} 
      aria-label="Loading"
    />
  );
};

// Centered loading component for full-screen/container loading
interface CenteredLoadingProps {
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CenteredLoading = ({ 
  title = "Loading...", 
  description,
  size = 'md',
  className 
}: CenteredLoadingProps) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <LoadingSpinner size={size} />
        </div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
};

// Inline loading for buttons and small components
interface InlineLoadingProps {
  text: string;
  loadingText?: string;
  isLoading: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const InlineLoading = ({ 
  text, 
  loadingText, 
  isLoading, 
  size = 'sm',
  className 
}: InlineLoadingProps) => {
  if (!isLoading) return <span className={className}>{text}</span>;

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LoadingSpinner size={size} />
      {loadingText || text}
    </span>
  );
};

// Loading placeholder for navigation/lists
interface LoadingPlaceholderProps {
  message?: string;
  className?: string;
}

export const LoadingPlaceholder = ({ 
  message = "Loading...", 
  className 
}: LoadingPlaceholderProps) => {
  return (
    <div className={cn("p-3 text-muted-foreground text-xs", className)}>
      <div className="flex items-center gap-2">
        <LoadingSpinner size="sm" />
        {message}
      </div>
    </div>
  );
};

// Query loading wrapper - handles common useQuery loading patterns
interface QueryLoadingProps {
  data: unknown;
  loading?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  loadingComponent?: 'centered' | 'placeholder' | 'custom';
  loadingTitle?: string;
  loadingDescription?: string;
  className?: string;
}

export const QueryLoading = ({
  data,
  loading,
  error,
  children,
  loadingComponent = 'centered',
  loadingTitle,
  loadingDescription,
  className
}: QueryLoadingProps) => {
  // Handle error state
  if (data === null) {
    return error || (
      <div className={cn("p-6 text-center", className)}>
        <div className="text-destructive">Error loading data</div>
      </div>
    );
  }

  // Handle loading state
  if (data === undefined) {
    if (loading) return <>{loading}</>;

    switch (loadingComponent) {
      case 'placeholder':
        return <LoadingPlaceholder message={loadingTitle} className={className} />;
      case 'centered':
        return (
          <CenteredLoading 
            title={loadingTitle}
            description={loadingDescription}
            className={cn("p-6 h-full", className)}
          />
        );
      default:
        return loading;
    }
  }

  return <>{children}</>;
};

// Hook for standardized loading states
export const useLoadingState = () => {
  const [state, setState] = React.useState<LoadingState>('idle');

  const setLoading = () => setState('loading');
  const setSuccess = () => setState('success');
  const setError = () => setState('error');
  const setIdle = () => setState('idle');

  const isLoading = state === 'loading';
  const isError = state === 'error';
  const isSuccess = state === 'success';
  const isIdle = state === 'idle';

  return {
    state,
    setLoading,
    setSuccess,
    setError,
    setIdle,
    isLoading,
    isError,
    isSuccess,
    isIdle
  };
};