import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserDocument = User & Document

export type AuthProvider = 'local' | 'github' | 'phone'

@Schema({ timestamps: true })
export class UserProfile {
  @Prop({ required: true })
  name: string

  @Prop()
  avatar?: string

  @Prop()
  birthday?: number

  @Prop()
  gender?: string

  @Prop()
  bio?: string

  @Prop({ type: Object })
  metadata?: Record<string, any>
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  userId: string

  @Prop()
  password?: string

  @Prop({ type: UserProfile })
  profile: UserProfile

  @Prop({ type: [{ type: String }] })
  authProviders: AuthProvider[]

  @Prop({ type: Object })
  authData: {
    local?: {
      phoneNumber?: string
      email?: string
      passwordHash: string
    }
    github?: {
      githubId: string
      accessToken?: string
    }
    phone?: {
      phoneNumber: string
      isVerified: boolean
      lastVerificationTime?: Date
    }
  }

  @Prop({ type: Date, default: null })
  lastLoginAt: Date
}

export const UserSchema = SchemaFactory.createForClass(User)
