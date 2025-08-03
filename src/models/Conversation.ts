import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversation extends Document {
  name: string;
  participants: Types.ObjectId[];
  creatorId: Types.ObjectId;
  type: 'direct' | 'group' | 'channel';
  description?: string;
  isActive: boolean;
  isArchived: boolean;
  lastMessage?: {
    content: string;
    sender: Types.ObjectId;
    timestamp: Date;
  };
  settings: {
    allowNewMembers: boolean;
    readOnly: boolean;
    maxParticipants?: number;
  };
  metadata: {
    description?: string;
    avatar?: string;
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'channel'],
    default: 'direct'
  },
  description: {
    type: String,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  lastMessage: {
    content: {
      type: String,
      maxlength: 500
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  settings: {
    allowNewMembers: {
      type: Boolean,
      default: true
    },
    readOnly: {
      type: Boolean,
      default: false
    },
    maxParticipants: {
      type: Number,
      min: 2,
      max: 1000
    }
  },
  metadata: {
    description: {
      type: String,
      maxlength: 500
    },
    avatar: {
      type: String
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 20
    }]
  }
}, {
  timestamps: true
});

// Indexes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ isActive: 1 });
ConversationSchema.index({ 'lastMessage.timestamp': -1 });
ConversationSchema.index({ createdAt: -1 });

// Compound index for direct conversations
ConversationSchema.index({ 
  participants: 1, 
  type: 1 
}, { 
  unique: true,
  partialFilterExpression: { type: 'direct' }
});

// Virtual for participant count
ConversationSchema.virtual('participantCount').get(function() {
  return (this as any).participants.length;
});

// Pre-save middleware
ConversationSchema.pre('save', function(next) {
  // Direct conversations should have exactly 2 participants
  if ((this as any).type === 'direct' && (this as any).participants.length !== 2) {
    return next(new Error('Direct conversations must have exactly 2 participants'));
  }
  
  // Remove duplicates from participants
  (this as any).participants = [...new Set((this as any).participants)];
  
  next();
});

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema); 