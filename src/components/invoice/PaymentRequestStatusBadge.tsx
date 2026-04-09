import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PaymentRequestStatus } from '@/types'

const STATUS_CONFIG: Record<
  PaymentRequestStatus,
  { label: string; className: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: {
    label: '임시저장',
    variant: 'secondary',
    className: '',
  },
  sent: {
    label: '발행완료',
    variant: 'default',
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  paid: {
    label: '지급완료',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-600',
  },
  cancelled: {
    label: '취소',
    variant: 'outline',
    className: 'line-through',
  },
}

interface PaymentRequestStatusBadgeProps {
  status: PaymentRequestStatus
  className?: string
}

export default function PaymentRequestStatusBadge({
  status,
  className,
}: PaymentRequestStatusBadgeProps) {
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
