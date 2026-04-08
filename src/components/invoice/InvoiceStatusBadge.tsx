import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@/types'

const STATUS_CONFIG: Record<
  InvoiceStatus,
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
  paid: {
    label: '결제완료',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-600',
  },
  overdue: {
    label: '연체',
    variant: 'destructive',
    className: '',
  },
  cancelled: {
    label: '취소',
    variant: 'outline',
    className: 'line-through',
  },
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export default function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
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
