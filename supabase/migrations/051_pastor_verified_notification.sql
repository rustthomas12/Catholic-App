-- 051: notification for an approved pastor application (opens their parish dashboard)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pastor_verified';
