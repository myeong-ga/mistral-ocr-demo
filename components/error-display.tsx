"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ErrorDisplayProps {
  message: string
  details?: string
  onRetry?: () => void
}

export function ErrorDisplay({ message, details, onRetry }: ErrorDisplayProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {details && (
          <details className="mt-2 text-xs">
            <summary>Technical details</summary>
            <p className="mt-1">{details}</p>
          </details>
        )}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

