import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  role: 'user' | 'admin' | 'moderator';
  lastLoginAt?: Date;
  loginCount: number;
  profile: {
    displayName: string;
    avatar?: string;
    bio: string;
    location: string;
    website: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  profile: {
    displayName: {
      type: String,
      default: function() {
        return `${this.firstName} ${this.lastName}`.trim();
      }
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500
    },
    location: {
      type: String,
      default: '',
      maxlength: 100
    },
    website: {
      type: String,
      default: '',
      maxlength: 200
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'tr'
    },
    timezone: {
      type: String,
      default: 'Europe/Istanbul'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).password;
      return ret;
    }
  }
});

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware
UserSchema.pre('save', function(next) {
  if (this.isModified('password')) {
    // Burada password hash'leme işlemi yapılabilir
    console.log('Password değiştirildi, hash\'leme gerekli');
  }
  next();
});

export const User = mongoose.model<IUser>('User', UserSchema); 