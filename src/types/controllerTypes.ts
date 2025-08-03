import { Request } from 'express';

// Redis Controller Types
export interface RedisSetValueRequest extends Request {
  body: {
    key: string;
    value: string;
    ttl?: number;
  };
}

export interface RedisGetValueRequest extends Request {
  params: {
    key: string;
  };
}

export interface RedisDeleteValueRequest extends Request {
  params: {
    key: string;
  };
}

export interface RedisCheckExistsRequest extends Request {
  params: {
    key: string;
  };
}

export interface RedisSetExpiryRequest extends Request {
  params: {
    key: string;
  };
  body: {
    seconds: number;
  };
}

// RabbitMQ Controller Types
export interface RabbitMQCreateQueueRequest extends Request {
  body: {
    queueName: string;
    options?: {
      durable?: boolean;
      autoDelete?: boolean;
      arguments?: any;
    };
  };
}

export interface RabbitMQPublishMessageRequest extends Request {
  body: {
    queueName: string;
    message: any;
    messageType?: string;
  };
}

export interface RabbitMQGetQueueInfoRequest extends Request {
  params: {
    queueName: string;
  };
}

export interface RabbitMQPurgeQueueRequest extends Request {
  params: {
    queueName: string;
  };
}

export interface RabbitMQDeleteQueueRequest extends Request {
  params: {
    queueName: string;
  };
}

export interface RabbitMQStartConsumingRequest extends Request {
  params: {
    queueName: string;
  };
}

export interface RabbitMQPublishBatchMessagesRequest extends Request {
  body: {
    queueName: string;
    messages: Array<{
      type?: string;
      data: any;
    }>;
  };
}

// MongoDB Controller Types
export interface MongoDBGetCollectionStatsRequest extends Request {
  params: {
    collectionName: string;
  };
}

export interface MongoDBGetUsersRequest extends Request {
  query: {
    page?: string;
    limit?: string;
    role?: string;
    isActive?: string;
  };
}

export interface MongoDBGetConversationsRequest extends Request {
  query: {
    page?: string;
    limit?: string;
    type?: string;
    isActive?: string;
  };
}

export interface MongoDBGetMessagesRequest extends Request {
  params: {
    conversationId: string;
  };
  query: {
    page?: string;
    limit?: string;
  };
}

export interface MongoDBGetAutoMessagesRequest extends Request {
  query: {
    page?: string;
    limit?: string;
    triggerType?: string;
    isActive?: string;
  };
}

// User creation request
export interface MongoDBCreateUserRequest extends Request {
  body: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    isActive?: boolean;
    preferences?: {
      language?: string;
      timezone?: string;
      notifications?: {
        email?: boolean;
        push?: boolean;
        sms?: boolean;
      };
    };
  };
}

// Conversation creation request
export interface MongoDBCreateConversationRequest extends Request {
  body: {
    type: 'direct' | 'group' | 'channel';
    participants: string[];
    name?: string;
    description?: string;
    isActive?: boolean;
    settings?: {
      allowInvites?: boolean;
      readOnly?: boolean;
      maxParticipants?: number;
    };
  };
}

// Message creation request
export interface MongoDBCreateMessageRequest extends Request {
  body: {
    conversationId: string;
    sender: string;
    content: string;
    contentType?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';
    messageType?: 'normal' | 'reply' | 'forward' | 'auto';
    replyTo?: string;
    attachments?: Array<{
      type: string;
      url: string;
      name: string;
      size?: number;
    }>;
  };
}

// AutoMessage creation request
export interface MongoDBCreateAutoMessageRequest extends Request {
  body: {
    name: string;
    triggerType: 'keyword' | 'event' | 'schedule' | 'condition';
    triggerConfig: {
      keywords?: string[];
      eventType?: string;
      schedule?: {
        cron?: string;
        timezone?: string;
      };
      conditions?: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
    };
    messageTemplate: {
      content: string;
      variables?: string[];
    };
    targetConfig: {
      conversationIds?: string[];
      userIds?: string[];
      roles?: string[];
    };
    settings: {
      isActive: boolean;
      priority: number;
      maxExecutions?: number;
      cooldown?: number;
    };
  };
} 