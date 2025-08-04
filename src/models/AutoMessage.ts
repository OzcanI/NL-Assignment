import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAutoMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: string;
  sendDate: Date;
  repeatType: 'none' | 'daily' | 'weekly' | 'monthly';
  repeatInterval?: number;
  isQueued: boolean;
  isSent: boolean;
  isFailed: boolean;
  queuedAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  metadata?: {
    planningType?: string;
    receiverId?: Types.ObjectId;
    plannedAt?: Date;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AutoMessageSchema = new Schema<IAutoMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  messageType: {
    type: String,
    required: true,
    enum: ['text', 'image', 'file', 'audio', 'video']
  },
  sendDate: {
    type: Date,
    required: true
  },
  repeatType: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none'
  },
  repeatInterval: {
    type: Number,
    min: 1
  },
  isQueued: {
    type: Boolean,
    default: false
  },
  isSent: {
    type: Boolean,
    default: false
  },
  isFailed: {
    type: Boolean,
    default: false
  },
  queuedAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  metadata: {
    planningType: {
      type: String
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    plannedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Indexes
AutoMessageSchema.index({ conversationId: 1 });
AutoMessageSchema.index({ senderId: 1 });
AutoMessageSchema.index({ sendDate: 1 });
AutoMessageSchema.index({ isQueued: 1 });
AutoMessageSchema.index({ isSent: 1 });
AutoMessageSchema.index({ isFailed: 1 });

// Compound indexes
AutoMessageSchema.index({ 
  sendDate: 1, 
  isQueued: 1, 
  isSent: 1, 
  isFailed: 1 
});

// Pre-save middleware
AutoMessageSchema.pre('save', function(next) {
  // Validate send date is in the future
  if (this.sendDate <= new Date()) {
    return next(new Error('Send date must be in the future'));
  }
  
  next();
});

// Static method to find pending auto messages
(AutoMessageSchema.statics as any).findPending = async function() {
  const now = new Date();
  return this.find({
    sendDate: { $lte: now },
    isQueued: false,
    isSent: false,
    isFailed: false
  })
};

// Static method to find auto messages by conversation
(AutoMessageSchema.statics as any).findByConversation = async function(conversationId: string) {
  return this.find({
    conversationId: conversationId
  }).populate('senderId', 'username firstName lastName')
    .sort({ sendDate: 1 });
};

// Instance method to mark as queued
(AutoMessageSchema.methods as any).markAsQueued = async function() {
  (this as any).isQueued = true;
  (this as any).queuedAt = new Date();
  await (this as any).save();
  return this;
};

// Instance method to mark as sent
(AutoMessageSchema.methods as any).markAsSent = async function() {
  (this as any).isSent = true;
  (this as any).sentAt = new Date();
  await (this as any).save();
  return this;
};

// Instance method to mark as failed
(AutoMessageSchema.methods as any).markAsFailed = async function(errorMessage: string) {
  (this as any).isFailed = true;
  (this as any).failedAt = new Date();
  (this as any).errorMessage = errorMessage;
  await (this as any).save();
  return this;
};

export const AutoMessage = mongoose.model<IAutoMessage>('AutoMessage', AutoMessageSchema); 