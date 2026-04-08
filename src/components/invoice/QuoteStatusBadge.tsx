import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { QuoteStatus } from '@/types'

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; className: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: {
    label: '임시저장',
    variant: 'secondary',
    className: '',
  },
  sent: {
    label: '발송됨',
    variant: 'default',
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  accepted: {
    label: '수락됨',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-600',
  },
  rejected: {
    label: '거절됨',
    variant: 'destructive',
    className: '',
  },
  expired: {
    label: '만료됨',
    variant: 'outline',
    className: '',
  },
}

interface QuoteStatusBadgeProps {
  status: QuoteStatus
  className?: string
}

export default function QuoteStatusBadge({
  status,
  className,
}: QuoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
