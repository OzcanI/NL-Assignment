import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'system';
  replyTo?: Types.ObjectId;
  status: 'sent' | 'delivered' | 'read';
  readAt?: Date;
  readBy?: Types.ObjectId;
  isEdited: boolean;
  editedAt?: Date;
  attachments?: {
    type: string;
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }[];
  metadata: {
    sentAt: Date;
    clientInfo: string;
    ipAddress: string;
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    readBy: Types.ObjectId[];
    deliveredTo: Types.ObjectId[];
    reactions: {
      userId: Types.ObjectId;
      emoji: string;
      timestamp: Date;
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video', 'location', 'system'],
    default: 'text'
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readAt: {
    type: Date
  },
  readBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  attachments: [{
    type: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    }
  }],
  metadata: {
    sentAt: {
      type: Date,
      default: Date.now
    },
    clientInfo: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    deliveredTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    reactions: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      emoji: {
        type: String,
        required: true,
        maxlength: 10
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ 'metadata.isDeleted': 1 });
MessageSchema.index({ messageType: 1 });
MessageSchema.index({ status: 1 });

// Compound indexes for better query performance
MessageSchema.index({ conversationId: 1, 'metadata.isDeleted': 1, createdAt: -1 });

// Virtual for reaction count
MessageSchema.virtual('reactionCount').get(function() {
  return this.metadata.reactions.length;
});

// Virtual for read count
MessageSchema.virtual('readCount').get(function() {
  return this.metadata.readBy.length;
});

// Pre-save middleware
MessageSchema.pre('save', function(next) {
  // If message is being edited, update editedAt
  if (this.isModified('content') && !this.isNew) {
    (this as any).isEdited = true;
    (this as any).editedAt = new Date();
    (this as any).metadata.isEdited = true;
    (this as any).metadata.editedAt = new Date();
  }
  
  // If message is being deleted, update deletedAt
  if (this.isModified('metadata.isDeleted') && (this as any).metadata.isDeleted) {
    (this as any).metadata.deletedAt = new Date();
  }
  
  next();
});

export const Message = mongoose.model<IMessage>('Message', MessageSchema); 