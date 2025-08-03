import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAutoMessage extends Document {
  name: string;
  description?: string;
  triggerType: 'keyword' | 'event' | 'schedule' | 'condition';
  triggerConfig: {
    keywords?: string[];
    events?: string[];
    schedule?: {
      cron: string;
      timezone: string;
    };
    conditions?: {
      field: string;
      operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists';
      value: any;
    }[];
  };
  messageTemplate: {
    content: string;
    contentType: 'text' | 'image' | 'file' | 'template';
    variables: string[];
  };
  targetConfig: {
    conversations?: Types.ObjectId[];
    users?: Types.ObjectId[];
    userGroups?: string[];
    broadcastToAll: boolean;
  };
  settings: {
    isActive: boolean;
    maxExecutions?: number;
    executionCount: number;
    cooldownPeriod: number; // seconds
    lastExecuted?: Date;
    priority: number;
  };
  metadata: {
    createdBy: Types.ObjectId;
    tags: string[];
    category: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AutoMessageSchema = new Schema<IAutoMessage>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  triggerType: {
    type: String,
    enum: ['keyword', 'event', 'schedule', 'condition'],
    required: true
  },
  triggerConfig: {
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    events: [{
      type: String,
      enum: ['user_join', 'user_leave', 'message_sent', 'conversation_created', 'user_online', 'user_offline']
    }],
    schedule: {
      cron: {
        type: String,
        validate: {
          validator: function(v: string) {
            // Basic cron validation (you might want to use a proper cron validator)
            return /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/.test(v);
          },
          message: 'Invalid cron expression'
        }
      },
      timezone: {
        type: String,
        default: 'UTC'
      }
    },
    conditions: [{
      field: {
        type: String,
        required: true
      },
      operator: {
        type: String,
        enum: ['equals', 'contains', 'greater', 'less', 'exists'],
        required: true
      },
      value: {
        type: Schema.Types.Mixed,
        required: true
      }
    }]
  },
  messageTemplate: {
    content: {
      type: String,
      required: true,
      maxlength: 2000
    },
    contentType: {
      type: String,
      enum: ['text', 'image', 'file', 'template'],
      default: 'text'
    },
    variables: [{
      type: String,
      trim: true
    }]
  },
  targetConfig: {
    conversations: [{
      type: Schema.Types.ObjectId,
      ref: 'Conversation'
    }],
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    userGroups: [{
      type: String,
      enum: ['all', 'online', 'offline', 'admin', 'moderator', 'user']
    }],
    broadcastToAll: {
      type: Boolean,
      default: false
    }
  },
  settings: {
    isActive: {
      type: Boolean,
      default: true
    },
    maxExecutions: {
      type: Number,
      min: 0
    },
    executionCount: {
      type: Number,
      default: 0
    },
    cooldownPeriod: {
      type: Number,
      default: 0,
      min: 0
    },
    lastExecuted: {
      type: Date
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    }
  },
  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 20
    }],
    category: {
      type: String,
      default: 'general',
      trim: true
    }
  }
}, {
  timestamps: true
});

// Indexes
AutoMessageSchema.index({ 'settings.isActive': 1 });
AutoMessageSchema.index({ triggerType: 1 });
AutoMessageSchema.index({ 'settings.priority': -1 });
AutoMessageSchema.index({ 'metadata.category': 1 });
AutoMessageSchema.index({ 'triggerConfig.keywords': 1 });
AutoMessageSchema.index({ 'settings.lastExecuted': 1 });

// Compound indexes
AutoMessageSchema.index({ 
  'settings.isActive': 1, 
  triggerType: 1, 
  'settings.priority': -1 
});

// Pre-save middleware
AutoMessageSchema.pre('save', function(next) {
  // Validate trigger configuration based on trigger type
  if (this.triggerType === 'keyword' && (!this.triggerConfig.keywords || this.triggerConfig.keywords.length === 0)) {
    return next(new Error('Keyword trigger requires at least one keyword'));
  }
  
  if (this.triggerType === 'event' && (!this.triggerConfig.events || this.triggerConfig.events.length === 0)) {
    return next(new Error('Event trigger requires at least one event'));
  }
  
  if (this.triggerType === 'schedule' && !this.triggerConfig.schedule?.cron) {
    return next(new Error('Schedule trigger requires a cron expression'));
  }
  
  if (this.triggerType === 'condition' && (!this.triggerConfig.conditions || this.triggerConfig.conditions.length === 0)) {
    return next(new Error('Condition trigger requires at least one condition'));
  }
  
  next();
});

// Static method to find active auto messages by trigger type
(AutoMessageSchema.statics as any).findActiveByTrigger = async function(triggerType: string) {
  return this.find({
    'settings.isActive': true,
    triggerType: triggerType
  }).sort({ 'settings.priority': -1 });
};

// Static method to find auto messages by keyword
(AutoMessageSchema.statics as any).findByKeyword = async function(keyword: string) {
  return this.find({
    'settings.isActive': true,
    triggerType: 'keyword',
    'triggerConfig.keywords': { $in: [keyword.toLowerCase()] }
  }).sort({ 'settings.priority': -1 });
};

// Instance method to check if auto message can be executed
(AutoMessageSchema.methods as any).canExecute = function(): boolean {
  if (!(this as any).settings.isActive) return false;
  
  if ((this as any).settings.maxExecutions && (this as any).settings.executionCount >= (this as any).settings.maxExecutions) {
    return false;
  }
  
  if ((this as any).settings.cooldownPeriod > 0 && (this as any).settings.lastExecuted) {
    const timeSinceLastExecution = Date.now() - (this as any).settings.lastExecuted.getTime();
    if (timeSinceLastExecution < (this as any).settings.cooldownPeriod * 1000) {
      return false;
    }
  }
  
  return true;
};

// Instance method to execute auto message
(AutoMessageSchema.methods as any).execute = async function() {
  if (!(this as any).canExecute()) {
    throw new Error('Auto message cannot be executed at this time');
  }
  
  (this as any).settings.executionCount += 1;
  (this as any).settings.lastExecuted = new Date();
  await (this as any).save();
  
  return this;
};

// Instance method to process message template with variables
(AutoMessageSchema.methods as any).processTemplate = function(variables: Record<string, any>): string {
  let content = (this as any).messageTemplate.content;
  
  // Replace variables in template
  (this as any).messageTemplate.variables.forEach((variable: string) => {
    const placeholder = `{{${variable}}}`;
    const value = variables[variable] || '';
    content = content.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return content;
};

export const AutoMessage = mongoose.model<IAutoMessage>('AutoMessage', AutoMessageSchema); 